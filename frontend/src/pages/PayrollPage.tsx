import { useEffect, useMemo, useState } from 'react';
import {
  LedgerBadge,
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
import type { Payroll } from '@/lib/types';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const monthOptions = monthNames.map((label, i) => ({ value: String(i + 1), label }));
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const now = new Date();

interface PayrollFormState {
  employeeName: string;
  employeeEmail: string;
  role: string;
  month: string;
  year: string;
  gross: string;
  deductions: string;
  status: string;
  paidDate: string;
  notes: string;
}

const emptyForm = (): PayrollFormState => ({
  employeeName: '',
  employeeEmail: '',
  role: '',
  month: String(now.getMonth() + 1),
  year: String(now.getFullYear()),
  gross: '',
  deductions: '0',
  status: 'pending',
  paidDate: todayISO(),
  notes: '',
});

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payroll | null>(null);
  const [form, setForm] = useState<PayrollFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll?limit=100');
      setPayrolls(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const totalNetCents = useMemo(() => payrolls.reduce((sum, p) => sum + p.netCents, 0), [payrolls]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (payroll: Payroll) => {
    setEditing(payroll);
    setForm({
      employeeName: payroll.employeeName,
      employeeEmail: payroll.employeeEmail ?? '',
      role: payroll.role ?? '',
      month: String(payroll.month),
      year: String(payroll.year),
      gross: (payroll.grossCents / 100).toString(),
      deductions: (payroll.deductionsCents / 100).toString(),
      status: payroll.status,
      paidDate: payroll.paidDate ? payroll.paidDate.slice(0, 10) : todayISO(),
      notes: payroll.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (payroll: Payroll) => {
    if (!window.confirm(`Delete payroll record for ${payroll.employeeName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/payroll/${payroll._id}`);
      setPayrolls((prev) => prev.filter((p) => p._id !== payroll._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payroll record');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        employeeName: form.employeeName,
        employeeEmail: form.employeeEmail || undefined,
        role: form.role || undefined,
        month: parseInt(form.month, 10),
        year: parseInt(form.year, 10),
        gross: form.gross ? parseFloat(form.gross) : 0,
        deductions: form.deductions ? parseFloat(form.deductions) : 0,
        status: form.status,
        paidDate: form.status === 'paid' ? form.paidDate : undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        const res = await api.put(`/payroll/${editing._id}`, payload);
        setPayrolls((prev) => prev.map((p) => (p._id === editing._id ? res.data.data : p)));
      } else {
        const res = await api.post('/payroll', payload);
        setPayrolls((prev) => [res.data.data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payroll record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Payroll"
        description={`${payrolls.length} records · ${formatCents(totalNetCents)} net total`}
        action={<LedgerButton onClick={openCreate}>+ New payroll entry</LedgerButton>}
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      <LedgerTable headers={['Employee', 'Role', 'Period', 'Gross', 'Deductions', 'Net', 'Status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={8}>Loading payroll…</LedgerEmptyRow>
        ) : payrolls.length === 0 ? (
          <LedgerEmptyRow colSpan={8}>No payroll records yet. Add your first one.</LedgerEmptyRow>
        ) : (
          payrolls.map((payroll) => (
            <LedgerRow key={payroll._id}>
              <LedgerCell strong>{payroll.employeeName}</LedgerCell>
              <LedgerCell muted>{payroll.role || '—'}</LedgerCell>
              <LedgerCell muted>{monthNames[payroll.month - 1]} {payroll.year}</LedgerCell>
              <LedgerCell>{formatCents(payroll.grossCents)}</LedgerCell>
              <LedgerCell muted>{formatCents(payroll.deductionsCents)}</LedgerCell>
              <LedgerCell className="font-semibold text-[#405048]">{formatCents(payroll.netCents)}</LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={payroll.status === 'paid' ? 'green' : 'yellow'}>{payroll.status}</LedgerBadge>
              </LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-3">
                  <LedgerRowAction onClick={() => openEdit(payroll)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(payroll)}>
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
        title={editing ? 'Edit payroll entry' : 'New payroll entry'}
        description="A pay run for one employee, for one period."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Employee name">
              <LedgerInput
                required
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Role">
              <LedgerInput
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Employee email">
            <LedgerInput
              type="email"
              value={form.employeeEmail}
              onChange={(e) => setForm({ ...form, employeeEmail: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Month">
              <LedgerFormSelect
                options={monthOptions}
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Year">
              <LedgerInput
                type="number"
                min="2000"
                max="2100"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </LedgerField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Gross (PKR)">
              <LedgerInput
                type="number"
                min="0"
                step="0.01"
                required
                value={form.gross}
                onChange={(e) => setForm({ ...form, gross: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Deductions (PKR)">
              <LedgerInput
                type="number"
                min="0"
                step="0.01"
                value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: e.target.value })}
              />
            </LedgerField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Status">
              <LedgerFormSelect
                options={statusOptions}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </LedgerField>
            {form.status === 'paid' && (
              <LedgerField label="Paid date">
                <LedgerInput
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => setForm({ ...form, paidDate: e.target.value })}
                />
              </LedgerField>
            )}
          </div>
          <LedgerField label="Notes">
            <LedgerTextarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </LedgerField>
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create entry'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
