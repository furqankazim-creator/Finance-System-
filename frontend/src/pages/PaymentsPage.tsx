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
  LedgerSelect,
  LedgerStatCard,
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { Invoice, PaymentRecord } from '@/lib/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

const methodOptions = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
const methodFilterOptions = [{ value: '', label: 'All methods' }, ...methodOptions];
const methodLabel = (m: string) => methodOptions.find((o) => o.value === m)?.label ?? m;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoiceId: '',
    amount: '',
    paidDate: todayISO(),
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = methodFilter ? `?method=${methodFilter}` : '';
      const [payRes, invRes] = await Promise.all([api.get(`/payments${params}`), api.get('/invoices?limit=100')]);
      setPayments(payRes.data.data);
      setInvoices(invRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [methodFilter]);

  const paidByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => {
      if (p.invoiceId) map.set(p.invoiceId._id, (map.get(p.invoiceId._id) ?? 0) + p.amountCents);
    });
    return map;
  }, [payments]);

  const payableInvoices = useMemo(
    () =>
      invoices
        .filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'draft')
        .map((i) => ({ invoice: i, remaining: i.amountCents - (paidByInvoice.get(i._id) ?? 0) }))
        .filter((x) => x.remaining > 0),
    [invoices, paidByInvoice]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const total = payments.reduce((s, p) => s + p.amountCents, 0);
    const thisMonth = payments
      .filter((p) => {
        const d = new Date(p.paidDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + p.amountCents, 0);
    const outstanding = payableInvoices.reduce((s, x) => s + x.remaining, 0);
    return { total, thisMonth, outstanding };
  }, [payments, payableInvoices]);

  const openCreate = () => {
    const first = payableInvoices[0];
    setForm({
      invoiceId: first?.invoice._id ?? '',
      amount: first ? (first.remaining / 100).toString() : '',
      paidDate: todayISO(),
      method: 'bank_transfer',
      reference: '',
      notes: '',
    });
    setError('');
    setModalOpen(true);
  };

  const onInvoiceChange = (invoiceId: string) => {
    const found = payableInvoices.find((x) => x.invoice._id === invoiceId);
    setForm({ ...form, invoiceId, amount: found ? (found.remaining / 100).toString() : form.amount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/invoices/${form.invoiceId}/payments`, {
        amount: parseFloat(form.amount),
        paidDate: form.paidDate,
        method: form.method,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PaymentRecord) => {
    if (!window.confirm('Delete this payment? The invoice balance will be re-opened.')) return;
    try {
      await api.delete(`/payments/${p._id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Payments"
        description={`${payments.length} payments received · ${formatCents(stats.total)} total`}
        action={<LedgerButton onClick={openCreate}>+ Record payment</LedgerButton>}
      />

      {error && !modalOpen && <LedgerFormError>{error}</LedgerFormError>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LedgerStatCard label="Received (all time)" value={formatCents(stats.total)} note="Across all invoices" noteTone="positive" />
        <LedgerStatCard label="Received this month" value={formatCents(stats.thisMonth)} note="Current calendar month" />
        <LedgerStatCard
          label="Still outstanding"
          value={formatCents(stats.outstanding)}
          note={`${payableInvoices.length} unpaid invoices`}
          noteTone={stats.outstanding ? 'negative' : 'positive'}
        />
      </div>

      <div className="flex gap-2">
        <LedgerSelect value={methodFilter} onChange={setMethodFilter} options={methodFilterOptions} />
      </div>

      <LedgerTable headers={['Date', 'Invoice', 'Client', 'Method', 'Reference', 'Amount', 'Invoice status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={8}>Loading payments…</LedgerEmptyRow>
        ) : payments.length === 0 ? (
          <LedgerEmptyRow colSpan={8}>No payments recorded yet.</LedgerEmptyRow>
        ) : (
          payments.map((p) => (
            <LedgerRow key={p._id}>
              <LedgerCell muted>{new Date(p.paidDate).toLocaleDateString()}</LedgerCell>
              <LedgerCell strong>{p.invoiceId?.invoiceNumber ?? '—'}</LedgerCell>
              <LedgerCell muted>{p.invoiceId?.clientId?.name ?? '—'}</LedgerCell>
              <LedgerCell muted>{methodLabel(p.method)}</LedgerCell>
              <LedgerCell muted>{p.reference || '—'}</LedgerCell>
              <LedgerCell className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCents(p.amountCents)}</LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={p.invoiceId?.status === 'paid' ? 'green' : 'yellow'}>
                  {p.invoiceId?.status === 'paid' ? 'paid in full' : 'partial'}
                </LedgerBadge>
              </LedgerCell>
              <LedgerCell className="text-right">
                <LedgerRowAction tone="danger" onClick={() => handleDelete(p)}>
                  Delete
                </LedgerRowAction>
              </LedgerCell>
            </LedgerRow>
          ))
        )}
      </LedgerTable>

      <LedgerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record payment"
        description="Log money received against an unpaid invoice."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <LedgerField label="Invoice">
            <LedgerFormSelect
              required
              options={[
                { value: '', label: payableInvoices.length ? 'Select an invoice…' : 'No unpaid invoices' },
                ...payableInvoices.map(({ invoice, remaining }) => ({
                  value: invoice._id,
                  label: `${invoice.invoiceNumber} · ${
                    typeof invoice.clientId === 'string' ? '' : invoice.clientId?.name ?? ''
                  } · due ${formatCents(remaining)}`,
                })),
              ]}
              value={form.invoiceId}
              onChange={(e) => onInvoiceChange(e.target.value)}
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
            <LedgerField label="Paid date">
              <LedgerInput
                type="date"
                required
                value={form.paidDate}
                onChange={(e) => setForm({ ...form, paidDate: e.target.value })}
              />
            </LedgerField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Method">
              <LedgerFormSelect
                options={methodOptions}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Reference">
              <LedgerInput
                placeholder="Txn / cheque no."
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Notes">
            <LedgerTextarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </LedgerField>
          <LedgerFormActions>
            <LedgerButton variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving || !form.invoiceId}>
              {saving ? 'Saving…' : 'Record payment'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}

