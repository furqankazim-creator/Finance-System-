import { useEffect, useMemo, useState } from 'react';
import {
  LedgerButton,
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
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { Account, Expense, ExpenseCategory, Project } from '@/lib/types';

interface ExpenseFormState {
  date: string;
  vendor: string;
  description: string;
  categoryId: string;
  projectId: string;
  accountId: string;
  amount: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (categoryId: string): ExpenseFormState => ({
  date: todayISO(),
  vendor: '',
  description: '',
  categoryId,
  projectId: '',
  accountId: '',
  amount: '',
});

function categoryLabel(categoryId: Expense['categoryId']) {
  if (typeof categoryId === 'string') return categoryId;
  return categoryId?.name ?? 'Uncategorized';
}

function projectLabel(projectId: Expense['projectId']) {
  if (!projectId) return '—';
  if (typeof projectId === 'string') return projectId;
  return projectId.name;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm(''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [expensesRes, categoriesRes, projectsRes, accountsRes] = await Promise.all([
        api.get('/expenses?limit=100'),
        api.get('/categories'),
        api.get('/projects?limit=100'),
        api.get('/accounts?type=expense'),
      ]);
      setExpenses(expensesRes.data.data);
      setCategories(categoriesRes.data.data);
      setProjects(projectsRes.data.data);
      setAccounts(accountsRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const totalCents = useMemo(() => expenses.reduce((sum, e) => sum + e.amountCents, 0), [expenses]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?._id ?? ''));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      date: expense.date.slice(0, 10),
      vendor: expense.vendor,
      description: expense.description ?? '',
      categoryId: typeof expense.categoryId === 'string' ? expense.categoryId : expense.categoryId._id,
      projectId: expense.projectId ? (typeof expense.projectId === 'string' ? expense.projectId : expense.projectId._id) : '',
      accountId: expense.accountId ?? '',
      amount: (expense.amountCents / 100).toString(),
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete expense from ${expense.vendor}? This cannot be undone.`)) return;
    try {
      await api.delete(`/expenses/${expense._id}`);
      setExpenses((prev) => prev.filter((e) => e._id !== expense._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        vendor: form.vendor,
        description: form.description || undefined,
        categoryId: form.categoryId,
        projectId: form.projectId || null,
        accountId: form.accountId || null,
        amount: form.amount ? parseFloat(form.amount) : 0,
      };
      if (editing) {
        const res = await api.put(`/expenses/${editing._id}`, payload);
        setExpenses((prev) => prev.map((ex) => (ex._id === editing._id ? res.data.data : ex)));
      } else {
        const res = await api.post('/expenses', payload);
        setExpenses((prev) => [res.data.data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Expenses"
        description={`${expenses.length} entries · ${formatCents(totalCents)} total`}
        action={
          <LedgerButton onClick={openCreate} disabled={categories.length === 0}>
            + New expense
          </LedgerButton>
        }
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}
      {!loading && categories.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Add a category first before logging an expense.</p>
      )}

      <LedgerTable headers={['Date', 'Vendor', 'Category', 'Project', 'Amount', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={6}>Loading expenses…</LedgerEmptyRow>
        ) : expenses.length === 0 ? (
          <LedgerEmptyRow colSpan={6}>No expenses yet. Add your first one.</LedgerEmptyRow>
        ) : (
          expenses.map((expense) => (
            <LedgerRow key={expense._id}>
              <LedgerCell muted>{expense.date.slice(0, 10)}</LedgerCell>
              <LedgerCell strong>{expense.vendor}</LedgerCell>
              <LedgerCell>{categoryLabel(expense.categoryId)}</LedgerCell>
              <LedgerCell muted>{projectLabel(expense.projectId)}</LedgerCell>
              <LedgerCell className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCents(expense.amountCents)}</LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-3">
                  <LedgerRowAction onClick={() => openEdit(expense)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(expense)}>
                    Delete
                  </LedgerRowAction>
                </div>
              </LedgerCell>
            </LedgerRow>
          ))
        )}
      </LedgerTable>

      <LedgerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit expense' : 'New expense'}
        description="Money going out."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Date">
              <LedgerInput
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </LedgerField>
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
          </div>
          <LedgerField label="Vendor">
            <LedgerInput
              required
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Category">
              <LedgerFormSelect
                required
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Project">
              <LedgerFormSelect
                options={[{ value: '', label: 'No project' }, ...projects.map((p) => ({ value: p._id, label: p.name }))]}
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Account (Chart of Accounts, optional)">
            <LedgerFormSelect
              options={[
                { value: '', label: 'Not tagged' },
                ...accounts.map((a) => ({ value: a._id, label: `${a.accountNumber} · ${a.name}` })),
              ]}
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Description">
            <LedgerTextarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </LedgerField>
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create expense'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
