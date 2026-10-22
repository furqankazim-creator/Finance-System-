import { useEffect, useState } from 'react';
import {
  LedgerBadge,
  LedgerButton,
  LedgerCell,
  LedgerEmptyRow,
  LedgerField,
  LedgerFormActions,
  LedgerFormError,
  LedgerHeader,
  LedgerInput,
  LedgerModal,
  LedgerPage,
  LedgerRow,
  LedgerRowAction,
  LedgerSectionTitle,
  LedgerStatCard,
  LedgerTable,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { PayablesReceivables, Transaction } from '@/lib/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PayablesReceivablesPage() {
  const [data, setData] = useState<PayablesReceivables | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payingLoan, setPayingLoan] = useState<Transaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payables-receivables');
      setData(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payables & receivables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPayLoan = (loan: Transaction) => {
    setPayingLoan(loan);
    setPayAmount((((loan.amountCents - loan.paidCents) / 100).toFixed(2)));
    setPayDate(todayISO());
    setPayError('');
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan) return;
    setPaySaving(true);
    setPayError('');
    try {
      await api.post(`/transactions/${payingLoan._id}/pay`, {
        amount: payAmount ? parseFloat(payAmount) : 0,
      });
      setPayingLoan(null);
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Payables & Receivables"
        description="What clients owe you, and what you owe — loans and salary dues."
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      {loading || !data ? (
        <p className="text-[12px] text-[#8b8f85]">Loading…</p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <LedgerStatCard label="Total receivable" value={formatCents(data.receivables.totalCents)} note="Unpaid invoices" noteTone="muted" />
            <LedgerStatCard label="Loans outstanding" value={formatCents(data.payables.loansTotalCents)} note="Open liabilities" noteTone="negative" />
            <LedgerStatCard label="Salary dues" value={formatCents(data.payables.salaryDuesTotalCents)} note="Pending payroll" noteTone="negative" />
          </section>

          <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
            <LedgerSectionTitle>Receivables · unpaid invoices</LedgerSectionTitle>
            <LedgerTable headers={['Number', 'Client', 'Due', 'Status', 'Amount']} compact>
              {data.receivables.invoices.length === 0 ? (
                <LedgerEmptyRow colSpan={5}>Nothing outstanding — all invoices are settled.</LedgerEmptyRow>
              ) : (
                data.receivables.invoices.map((invoice) => (
                  <LedgerRow key={invoice._id}>
                    <LedgerCell strong>{invoice.invoiceNumber}</LedgerCell>
                    <LedgerCell muted>{typeof invoice.clientId === 'string' ? invoice.clientId : invoice.clientId.name}</LedgerCell>
                    <LedgerCell muted>{invoice.dueDate.slice(0, 10)}</LedgerCell>
                    <LedgerCell>
                      <LedgerBadge tone={invoice.status === 'overdue' ? 'red' : 'yellow'}>{invoice.status}</LedgerBadge>
                    </LedgerCell>
                    <LedgerCell className="font-semibold text-[#405048]">{formatCents(invoice.amountCents)}</LedgerCell>
                  </LedgerRow>
                ))
              )}
            </LedgerTable>
          </section>

          <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
            <LedgerSectionTitle>Payables · loans</LedgerSectionTitle>
            <LedgerTable headers={['Ref', 'Debtor', 'Date', 'Amount', 'Paid', 'Remaining', '']} compact>
              {data.payables.loans.length === 0 ? (
                <LedgerEmptyRow colSpan={7}>No open loans.</LedgerEmptyRow>
              ) : (
                data.payables.loans.map((loan) => (
                  <LedgerRow key={loan._id}>
                    <LedgerCell strong>{loan.transactionRef}</LedgerCell>
                    <LedgerCell muted>{loan.debtor || '—'}</LedgerCell>
                    <LedgerCell muted>{loan.date.slice(0, 10)}</LedgerCell>
                    <LedgerCell>{formatCents(loan.amountCents)}</LedgerCell>
                    <LedgerCell muted>{formatCents(loan.paidCents)}</LedgerCell>
                    <LedgerCell className="font-semibold text-[#405048]">{formatCents(loan.amountCents - loan.paidCents)}</LedgerCell>
                    <LedgerCell className="text-right">
                      <LedgerRowAction onClick={() => openPayLoan(loan)}>Record payment</LedgerRowAction>
                    </LedgerCell>
                  </LedgerRow>
                ))
              )}
            </LedgerTable>
          </section>

          <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
            <LedgerSectionTitle>Payables · salary dues</LedgerSectionTitle>
            <LedgerTable headers={['Employee', 'Role', 'Period', 'Net']} compact>
              {data.payables.salaryDues.length === 0 ? (
                <LedgerEmptyRow colSpan={4}>No pending payroll.</LedgerEmptyRow>
              ) : (
                data.payables.salaryDues.map((p) => (
                  <LedgerRow key={p._id}>
                    <LedgerCell strong>{p.employeeName}</LedgerCell>
                    <LedgerCell muted>{p.role || '—'}</LedgerCell>
                    <LedgerCell muted>{p.month}/{p.year}</LedgerCell>
                    <LedgerCell className="font-semibold text-[#405048]">{formatCents(p.netCents)}</LedgerCell>
                  </LedgerRow>
                ))
              )}
            </LedgerTable>
          </section>
        </>
      )}

      <LedgerModal
        open={payingLoan !== null}
        onClose={() => setPayingLoan(null)}
        title={`Record payment · ${payingLoan?.transactionRef ?? ''}`}
        description={payingLoan ? `Remaining balance: ${formatCents(payingLoan.amountCents - payingLoan.paidCents)}` : undefined}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          {payError && <LedgerFormError>{payError}</LedgerFormError>}
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Amount (PKR)">
              <LedgerInput
                type="number"
                min="0.01"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </LedgerField>
            <LedgerField label="Date">
              <LedgerInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </LedgerField>
          </div>
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setPayingLoan(null)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={paySaving}>
              {paySaving ? 'Recording…' : 'Record payment'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
