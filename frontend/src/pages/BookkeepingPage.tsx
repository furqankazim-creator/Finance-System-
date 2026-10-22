import { useEffect, useMemo, useState } from 'react';
import { HandCoins, Landmark, Package, Receipt, TrendingUp, X } from 'lucide-react';
import {
  LedgerBadge,
  LedgerButton,
  LedgerCard,
  LedgerCell,
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
  LedgerStatCard,
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { Account, AccountType, Transaction } from '@/lib/types';

const columns: {
  type: AccountType;
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'neutral';
  icon: typeof Landmark;
  accent: string;
  tint: string;
}[] = [
  { type: 'equity', label: 'Capital', tone: 'green', icon: Landmark, accent: '#0d6847', tint: '#e2f0e7' },
  { type: 'liability', label: 'Liabilities', tone: 'red', icon: HandCoins, accent: '#ba676f', tint: '#f7e6e7' },
  { type: 'asset', label: 'Assets', tone: 'neutral', icon: Package, accent: '#776f5f', tint: '#ece8de' },
  { type: 'revenue', label: 'Revenue', tone: 'green', icon: TrendingUp, accent: '#0d6847', tint: '#e2f0e7' },
  { type: 'expense', label: 'Expenses', tone: 'yellow', icon: Receipt, accent: '#8f7a2f', tint: '#f6efd6' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

interface TransactionFormState {
  accountId: string;
  amount: string;
  date: string;
  description: string;
  investorName: string;
  debtor: string;
  assetType: string;
  pictureUrl: string;
  location: string;
}

const emptyForm = (accountId: string): TransactionFormState => ({
  accountId,
  amount: '',
  date: todayISO(),
  description: '',
  investorName: '',
  debtor: '',
  assetType: '',
  pictureUrl: '',
  location: '',
});

function accountLabel(accountId: Transaction['accountId']) {
  if (typeof accountId === 'string') return accountId;
  return `${accountId.accountNumber} · ${accountId.name}`;
}

export default function BookkeepingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeType, setActiveType] = useState<AccountType | null>(null);
  const [form, setForm] = useState<TransactionFormState>(emptyForm(''));
  const [saving, setSaving] = useState(false);

  const [filterType, setFilterType] = useState<AccountType | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [transactionsRes, accountsRes] = await Promise.all([
        api.get('/transactions?limit=100'),
        api.get('/accounts'),
      ]);
      setTransactions(transactionsRes.data.data);
      setAccounts(accountsRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookkeeping data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const accountsForType = (type: AccountType) => accounts.filter((a) => a.type === type && a.isActive);

  const openAdd = (type: AccountType) => {
    setActiveType(type);
    setForm(emptyForm(accountsForType(type)[0]?._id ?? ''));
    setError('');
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!window.confirm(`Delete transaction ${transaction.transactionRef}? This cannot be undone.`)) return;
    try {
      await api.delete(`/transactions/${transaction._id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== transaction._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeType) return;
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        accountId: form.accountId,
        amount: form.amount ? parseFloat(form.amount) : 0,
        date: form.date,
        description: form.description || undefined,
      };
      if (activeType === 'equity') payload.investorName = form.investorName || undefined;
      if (activeType === 'liability') payload.debtor = form.debtor || undefined;
      if (activeType === 'asset') {
        payload.assetType = form.assetType || undefined;
        payload.pictureUrl = form.pictureUrl || undefined;
        payload.location = form.location || undefined;
      }
      if (activeType === 'revenue' || activeType === 'expense') {
        payload.pictureUrl = form.pictureUrl || undefined;
        payload.location = form.location || undefined;
      }

      const res = await api.post('/transactions', payload);
      setTransactions((prev) => [res.data.data, ...prev]);
      setActiveType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setSaving(false);
    }
  };

  const activeColumn = columns.find((c) => c.type === activeType);
  const activeAccounts = activeType ? accountsForType(activeType) : [];

  const totalsByType = useMemo(() => {
    const totals: Record<string, { count: number; totalCents: number }> = {};
    for (const t of transactions) {
      const bucket = totals[t.type] ?? { count: 0, totalCents: 0 };
      bucket.count += 1;
      bucket.totalCents += t.amountCents;
      totals[t.type] = bucket;
    }
    return totals;
  }, [transactions]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const netThisMonthCents = useMemo(() => {
    return transactions
      .filter((t) => new Date(t.date) >= monthStart)
      .reduce((sum, t) => {
        if (t.type === 'revenue') return sum + t.amountCents;
        if (t.type === 'expense') return sum - t.amountCents;
        return sum;
      }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const visibleTransactions = filterType ? transactions.filter((t) => t.type === filterType) : transactions;
  const filterColumn = columns.find((c) => c.type === filterType);

  return (
    <LedgerPage>
      <LedgerHeader
        title="Daily Bookkeeping"
        description="Every transaction, posted straight to your chart of accounts."
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      {!loading && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LedgerStatCard
            label="Total entries"
            value={String(transactions.length)}
            note={`${accounts.length} accounts in use`}
            noteTone="muted"
          />
          <LedgerStatCard
            label="Revenue logged"
            value={formatCents(totalsByType.revenue?.totalCents ?? 0)}
            note={`${totalsByType.revenue?.count ?? 0} entries`}
            noteTone="positive"
          />
          <LedgerStatCard
            label="Expenses logged"
            value={formatCents(totalsByType.expense?.totalCents ?? 0)}
            note={`${totalsByType.expense?.count ?? 0} entries`}
            noteTone="negative"
          />
          <LedgerStatCard
            label="Net this month"
            value={formatCents(netThisMonthCents)}
            note="Revenue − expenses, Bookkeeping only"
            noteTone={netThisMonthCents >= 0 ? 'positive' : 'negative'}
          />
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {columns.map((column) => {
          const Icon = column.icon;
          const bucket = totalsByType[column.type];
          const isActive = filterType === column.type;

          return (
            <LedgerCard
              key={column.type}
              className={cn(
                'cursor-pointer overflow-hidden p-0 transition',
                isActive && 'ring-2 ring-offset-1'
              )}
              style={isActive ? { boxShadow: `0 0 0 2px ${column.accent}` } : undefined}
            >
              <button
                type="button"
                className="block w-full p-4 text-left"
                onClick={() => setFilterType(isActive ? null : column.type)}
              >
                <div className="flex items-start justify-between">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: column.tint, color: column.accent }}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <LedgerBadge tone={column.tone}>{bucket?.count ?? 0}</LedgerBadge>
                </div>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b8f85]">
                  {column.label}
                </p>
                <p className="mt-0.5 text-[19px] leading-none text-[#20352d]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {formatCents(bucket?.totalCents ?? 0)}
                </p>
              </button>
              <div className="border-t border-[#ebe5da] px-4 py-2.5">
                <LedgerButton
                  className="w-full"
                  variant="secondary"
                  onClick={(e) => {
                    e?.stopPropagation();
                    openAdd(column.type);
                  }}
                  disabled={accountsForType(column.type).length === 0}
                >
                  + Add {column.label.toLowerCase()}
                </LedgerButton>
              </div>
            </LedgerCard>
          );
        })}
      </section>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#787d75]">
          {filterColumn ? (
            <>
              Showing <span className="font-semibold text-[#31443c]">{filterColumn.label}</span> ·{' '}
              {visibleTransactions.length} {visibleTransactions.length === 1 ? 'entry' : 'entries'}
            </>
          ) : (
            <>{transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} total</>
          )}
        </p>
        {filterType && (
          <button
            type="button"
            onClick={() => setFilterType(null)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0d6847] hover:underline"
          >
            <X size={12} /> Clear filter
          </button>
        )}
      </div>

      <LedgerTable headers={['Ref', 'Type', 'Account', 'Date', 'Description', 'Amount', 'Status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={8}>Loading transactions…</LedgerEmptyRow>
        ) : visibleTransactions.length === 0 ? (
          <LedgerEmptyRow colSpan={8}>
            {filterType ? `No ${filterColumn?.label.toLowerCase()} entries yet.` : 'No transactions recorded yet.'}
          </LedgerEmptyRow>
        ) : (
          visibleTransactions.map((transaction) => {
            const column = columns.find((c) => c.type === transaction.type);
            return (
              <LedgerRow key={transaction._id}>
                <LedgerCell strong>{transaction.transactionRef}</LedgerCell>
                <LedgerCell muted>
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: column?.accent ?? '#8b8f85' }}
                    />
                    {transaction.type}
                  </span>
                </LedgerCell>
                <LedgerCell muted>{accountLabel(transaction.accountId)}</LedgerCell>
                <LedgerCell muted>{transaction.date.slice(0, 10)}</LedgerCell>
                <LedgerCell muted>
                  {transaction.description || transaction.investorName || transaction.debtor || transaction.assetType || '—'}
                </LedgerCell>
                <LedgerCell className="font-semibold" style={{ color: column?.accent }}>
                  {transaction.type === 'expense' || transaction.type === 'liability' ? '−' : '+'}
                  {formatCents(transaction.amountCents)}
                </LedgerCell>
                <LedgerCell>
                  <LedgerBadge tone={transaction.status === 'settled' ? 'green' : 'yellow'}>{transaction.status}</LedgerBadge>
                </LedgerCell>
                <LedgerCell className="text-right">
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(transaction)}>
                    Delete
                  </LedgerRowAction>
                </LedgerCell>
              </LedgerRow>
            );
          })
        )}
      </LedgerTable>

      <LedgerModal
        open={activeType !== null}
        onClose={() => setActiveType(null)}
        title={`Add ${activeColumn?.label ?? ''} transaction`}
        description="Posts against an account in your chart of accounts."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          {activeAccounts.length === 0 ? (
            <p className="text-[12px] text-[#8b8f85]">
              No active accounts of this type yet — add one on the Chart of Accounts page first.
            </p>
          ) : (
            <>
              <LedgerField label="Account">
                <LedgerFormSelect
                  required
                  options={activeAccounts.map((a) => ({ value: a._id, label: `${a.accountNumber} · ${a.name}` }))}
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                />
              </LedgerField>
              <div className="grid grid-cols-2 gap-3">
                <LedgerField label="Amount (PKR)">
                  <LedgerInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </LedgerField>
                <LedgerField label="Date">
                  <LedgerInput
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </LedgerField>
              </div>

              {activeType === 'equity' && (
                <LedgerField label="Investor name">
                  <LedgerInput
                    value={form.investorName}
                    onChange={(e) => setForm({ ...form, investorName: e.target.value })}
                  />
                </LedgerField>
              )}
              {activeType === 'liability' && (
                <LedgerField label="Debtor (who this is owed to)">
                  <LedgerInput
                    value={form.debtor}
                    onChange={(e) => setForm({ ...form, debtor: e.target.value })}
                  />
                </LedgerField>
              )}
              {activeType === 'asset' && (
                <LedgerField label="Asset type">
                  <LedgerInput
                    value={form.assetType}
                    onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                  />
                </LedgerField>
              )}
              {(activeType === 'asset' || activeType === 'revenue' || activeType === 'expense') && (
                <div className="grid grid-cols-2 gap-3">
                  <LedgerField label="Picture URL (receipt/photo)">
                    <LedgerInput
                      value={form.pictureUrl}
                      onChange={(e) => setForm({ ...form, pictureUrl: e.target.value })}
                    />
                  </LedgerField>
                  <LedgerField label="Location">
                    <LedgerInput
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </LedgerField>
                </div>
              )}

              <LedgerField label="Description">
                <LedgerTextarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </LedgerField>
            </>
          )}
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setActiveType(null)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving || activeAccounts.length === 0}>
              {saving ? 'Saving…' : 'Record transaction'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
