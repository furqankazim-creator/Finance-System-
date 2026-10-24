import { useEffect, useMemo, useState } from 'react';
import {
  LedgerBadge,
  LedgerButton,
  LedgerCell,
  LedgerCheckboxField,
  LedgerEmptyRow,
  LedgerField,
  LedgerFormActions,
  LedgerFormError,
  LedgerFormSelect,
  LedgerHeader,
  LedgerInput,
  LedgerModal,
  LedgerPage,
  LedgerRow,
  LedgerRowAction,
  LedgerSectionTitle,
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import type { Account, AccountType } from '@/lib/types';

const typeSections: { type: AccountType; label: string }[] = [
  { type: 'equity', label: 'Capital (Equity)' },
  { type: 'liability', label: 'Liabilities' },
  { type: 'asset', label: 'Assets' },
  { type: 'revenue', label: 'Revenue' },
  { type: 'expense', label: 'Expenses' },
];

const typeOptions = typeSections.map((s) => ({ value: s.type, label: s.label }));

interface AccountFormState {
  accountNumber: string;
  name: string;
  type: AccountType;
  parentAccountId: string;
  description: string;
  isActive: boolean;
}

const emptyForm = (): AccountFormState => ({
  accountNumber: '',
  name: '',
  type: 'expense',
  parentAccountId: '',
  description: '',
  isActive: true,
});

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const byType = useMemo(() => {
    const grouped: Record<string, Account[]> = {};
    for (const section of typeSections) grouped[section.type] = [];
    for (const account of accounts) grouped[account.type]?.push(account);
    return grouped;
  }, [accounts]);

  const parentOptions = (type: AccountType, excludeId?: string) =>
    accounts.filter((a) => a.type === type && a._id !== excludeId);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setForm({
      accountNumber: account.accountNumber,
      name: account.name,
      type: account.type,
      parentAccountId: account.parentAccountId ?? '',
      description: account.description ?? '',
      isActive: account.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Delete account "${account.accountNumber} · ${account.name}"?`)) return;
    try {
      await api.delete(`/accounts/${account._id}`);
      setAccounts((prev) => prev.filter((a) => a._id !== account._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        accountNumber: form.accountNumber,
        name: form.name,
        type: form.type,
        parentAccountId: form.parentAccountId || null,
        description: form.description || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        const res = await api.put(`/accounts/${editing._id}`, payload);
        setAccounts((prev) => prev.map((a) => (a._id === editing._id ? res.data.data : a)));
      } else {
        const res = await api.post('/accounts', payload);
        setAccounts((prev) => [...prev, res.data.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Chart of Accounts"
        description="The account tree everything else posts against — capital, liabilities, assets, revenue, and expenses."
        action={<LedgerButton onClick={openCreate}>+ New account</LedgerButton>}
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      {loading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading chart of accounts…</p>
      ) : (
        typeSections.map((section) => (
          <section key={section.type} className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
            <LedgerSectionTitle>{section.label}</LedgerSectionTitle>
            <LedgerTable headers={['#', 'Name', 'Parent', 'Status', '']} compact>
              {byType[section.type].length === 0 ? (
                <LedgerEmptyRow colSpan={5}>No accounts in this section yet.</LedgerEmptyRow>
              ) : (
                byType[section.type].map((account) => {
                  const parent = accounts.find((a) => a._id === account.parentAccountId);
                  return (
                    <LedgerRow key={account._id}>
                      <LedgerCell muted>{account.accountNumber}</LedgerCell>
                      <LedgerCell strong>{account.name}</LedgerCell>
                      <LedgerCell muted>{parent ? `${parent.accountNumber} · ${parent.name}` : '—'}</LedgerCell>
                      <LedgerCell>
                        <LedgerBadge tone={account.isActive ? 'green' : 'neutral'}>
                          {account.isActive ? 'active' : 'inactive'}
                        </LedgerBadge>
                        {account.isSystem && <span className="ml-2 text-[10px] text-[#9aa097]">default</span>}
                      </LedgerCell>
                      <LedgerCell className="text-right">
                        <div className="flex justify-end gap-3">
                          <LedgerRowAction onClick={() => openEdit(account)}>Edit</LedgerRowAction>
                          {!account.isSystem && (
                            <LedgerRowAction tone="danger" onClick={() => handleDelete(account)}>
                              Delete
                            </LedgerRowAction>
                          )}
                        </div>
                      </LedgerCell>
                    </LedgerRow>
                  );
                })
              )}
            </LedgerTable>
          </section>
        ))
      )}

      <LedgerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit account' : 'New account'}
        description="A line in the chart of accounts."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Account number">
              <LedgerInput
                required
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Type">
              <LedgerFormSelect
                options={typeOptions}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType, parentAccountId: '' })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Name">
            <LedgerInput
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Parent account (optional)">
            <LedgerFormSelect
              options={[
                { value: '', label: 'None — top-level account' },
                ...parentOptions(form.type, editing?._id).map((a) => ({
                  value: a._id,
                  label: `${a.accountNumber} · ${a.name}`,
                })),
              ]}
              value={form.parentAccountId}
              onChange={(e) => setForm({ ...form, parentAccountId: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Description">
            <LedgerTextarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </LedgerField>
          <LedgerCheckboxField
            label="Active account"
            checked={form.isActive}
            onChange={(checked) => setForm({ ...form, isActive: checked })}
          />
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
