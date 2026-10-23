import { useEffect, useState } from 'react';
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
import type { Account, Client, Invoice, Project } from '@/lib/types';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const methodOptions = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

function badgeTone(status: Invoice['status']) {
  if (status === 'paid') return 'green';
  if (status === 'overdue') return 'red';
  if (status === 'sent') return 'yellow';
  return 'neutral';
}

function refName<T extends { name: string }>(ref: T | string | null | undefined, fallback = '—') {
  if (!ref) return fallback;
  return typeof ref === 'string' ? ref : ref.name;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

interface InvoiceFormState {
  clientId: string;
  projectId: string;
  accountId: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  description: string;
}

const emptyForm = (clientId: string): InvoiceFormState => ({
  clientId,
  projectId: '',
  accountId: '',
  amount: '',
  issueDate: todayISO(),
  dueDate: addDaysISO(30),
  status: 'draft',
  description: '',
});

interface PaymentFormState {
  amount: string;
  paidDate: string;
  method: string;
  reference: string;
}

const emptyPaymentForm = (): PaymentFormState => ({
  amount: '',
  paidDate: todayISO(),
  method: 'bank_transfer',
  reference: '',
});

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(emptyForm(''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm());
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [invoicesRes, clientsRes, projectsRes, accountsRes] = await Promise.all([
        api.get('/invoices?limit=100'),
        api.get('/clients?limit=100'),
        api.get('/projects?limit=100'),
        api.get('/accounts?type=revenue'),
      ]);
      setInvoices(invoicesRes.data.data);
      setClients(clientsRes.data.data);
      setProjects(projectsRes.data.data);
      setAccounts(accountsRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(clients[0]?._id ?? ''));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice);
    setForm({
      clientId: typeof invoice.clientId === 'string' ? invoice.clientId : invoice.clientId._id,
      projectId: invoice.projectId ? (typeof invoice.projectId === 'string' ? invoice.projectId : invoice.projectId._id) : '',
      accountId: invoice.accountId ?? '',
      amount: (invoice.amountCents / 100).toString(),
      issueDate: invoice.issueDate.slice(0, 10),
      dueDate: invoice.dueDate.slice(0, 10),
      status: invoice.status,
      description: invoice.description ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/invoices/${invoice._id}`);
      setInvoices((prev) => prev.filter((i) => i._id !== invoice._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    }
  };

  const downloadPdf = async (invoice: Invoice) => {
    try {
      const res = await api.get(`/invoices/${invoice._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber || invoice._id.slice(-6)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download official invoice PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        clientId: form.clientId,
        projectId: form.projectId || null,
        accountId: form.accountId || null,
        amount: form.amount ? parseFloat(form.amount) : 0,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        description: form.description || undefined,
      };
      if (editing) {
        const res = await api.put(`/invoices/${editing._id}`, payload);
        setInvoices((prev) => prev.map((i) => (i._id === editing._id ? res.data.data : i)));
      } else {
        const res = await api.post('/invoices', payload);
        setInvoices((prev) => [res.data.data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentForm(emptyPaymentForm());
    setPaymentError('');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    setPaymentSaving(true);
    setPaymentError('');
    try {
      await api.post(`/invoices/${paymentInvoice._id}/payments`, {
        amount: paymentForm.amount ? parseFloat(paymentForm.amount) : 0,
        paidDate: paymentForm.paidDate,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
      });
      setPaymentInvoice(null);
      await loadAll();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Invoices"
        description="What you've billed and what's been paid."
        action={
          <LedgerButton onClick={openCreate} disabled={clients.length === 0}>
            + New invoice
          </LedgerButton>
        }
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}
      {!loading && clients.length === 0 && (
        <p className="text-[12px] text-[#8b8f85]">Add a client first before creating an invoice.</p>
      )}

      <LedgerTable headers={['Number', 'Client', 'Project', 'Issued', 'Due', 'Status', 'Amount', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={8}>Loading invoices…</LedgerEmptyRow>
        ) : invoices.length === 0 ? (
          <LedgerEmptyRow colSpan={8}>No invoices yet. Add your first one.</LedgerEmptyRow>
        ) : (
          invoices.map((invoice) => (
            <LedgerRow key={invoice._id}>
              <LedgerCell strong>{invoice.invoiceNumber}</LedgerCell>
              <LedgerCell>{refName(invoice.clientId)}</LedgerCell>
              <LedgerCell muted>{refName(invoice.projectId)}</LedgerCell>
              <LedgerCell muted>{invoice.issueDate.slice(0, 10)}</LedgerCell>
              <LedgerCell muted>{invoice.dueDate.slice(0, 10)}</LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={badgeTone(invoice.status)}>{invoice.status}</LedgerBadge>
              </LedgerCell>
              <LedgerCell className="font-semibold text-[#405048]">{formatCents(invoice.amountCents)}</LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-2.5">
                  <LedgerRowAction onClick={() => downloadPdf(invoice)}>PDF</LedgerRowAction>
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <LedgerRowAction onClick={() => openPayment(invoice)}>Record payment</LedgerRowAction>
                  )}
                  <LedgerRowAction onClick={() => openEdit(invoice)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(invoice)}>
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
        title={editing ? `Edit ${editing.invoiceNumber}` : 'New invoice'}
        description="What you're billing a client for."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Client">
              <LedgerFormSelect
                required
                options={clients.map((c) => ({ value: c._id, label: c.name }))}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
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
            <LedgerField label="Status">
              <LedgerFormSelect
                options={statusOptions}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </LedgerField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Issue date">
              <LedgerInput
                type="date"
                required
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Due date">
              <LedgerInput
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </LedgerField>
          </div>
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create invoice'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>

      <LedgerModal
        open={paymentInvoice !== null}
        onClose={() => setPaymentInvoice(null)}
        title={`Record payment · ${paymentInvoice?.invoiceNumber ?? ''}`}
        description={paymentInvoice ? `Balance due: ${formatCents(paymentInvoice.amountCents)}` : undefined}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {paymentError && <LedgerFormError>{paymentError}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Amount (PKR)">
              <LedgerInput
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Paid date">
              <LedgerInput
                type="date"
                required
                value={paymentForm.paidDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
              />
            </LedgerField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Method">
              <LedgerFormSelect
                options={methodOptions}
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Reference">
              <LedgerInput
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setPaymentInvoice(null)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={paymentSaving}>
              {paymentSaving ? 'Recording…' : 'Record payment'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
