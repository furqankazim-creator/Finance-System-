import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
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
  LedgerStatCard,
  LedgerTable,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents, formatCentsCompact } from '@/lib/money';
import type {
  AccountSummary,
  Client,
  DashboardStats,
  ExpenseCategory,
  IncomeExpenseBreakdown,
  PayablesReceivables,
} from '@/lib/types';

const DONUT_COLORS = ['#0d6847', '#d98f3d', '#4a7fa6', '#8f7a2f', '#ba676f'];

type TxType = 'expense' | 'invoice';

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

interface TxFormState {
  categoryId: string;
  vendor: string;
  clientId: string;
  amount: string;
  date: string;
  dueDate: string;
}

const emptyTxForm = (categoryId: string, clientId: string): TxFormState => ({
  categoryId,
  vendor: '',
  clientId,
  amount: '',
  date: todayISO(),
  dueDate: addDaysISO(30),
});

function pctChange(current: number, previous: number): { note: string; tone: 'positive' | 'negative' | 'muted' } {
  if (previous === 0) {
    if (current === 0) return { note: 'No change vs previous', tone: 'muted' };
    return { note: 'New this month', tone: 'positive' };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { note: `${sign}${pct.toFixed(1)}% vs previous`, tone: pct >= 0 ? 'positive' : 'negative' };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [breakdown, setBreakdown] = useState<IncomeExpenseBreakdown | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payablesReceivables, setPayablesReceivables] = useState<PayablesReceivables | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [donutView, setDonutView] = useState<'income' | 'expense'>('income');

  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<TxType>('expense');
  const [txForm, setTxForm] = useState<TxFormState>(emptyTxForm('', ''));
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashboardRes, breakdownRes, categoriesRes, clientsRes, payablesRes, summaryRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/income-expense'),
        api.get('/categories'),
        api.get('/clients?limit=100'),
        api.get('/payables-receivables'),
        api.get('/accounts/summary'),
      ]);
      setStats(dashboardRes.data.data);
      setBreakdown(breakdownRes.data.data);
      setCategories(categoriesRes.data.data);
      setClients(clientsRes.data.data);
      setPayablesReceivables(payablesRes.data.data);
      setAccountSummary(summaryRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openAddTransaction = () => {
    setTxType('expense');
    setTxForm(emptyTxForm(categories[0]?._id ?? '', clients[0]?._id ?? ''));
    setTxError('');
    setModalOpen(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxSaving(true);
    setTxError('');
    try {
      if (txType === 'expense') {
        await api.post('/expenses', {
          date: txForm.date,
          vendor: txForm.vendor,
          categoryId: txForm.categoryId,
          amount: txForm.amount ? parseFloat(txForm.amount) : 0,
        });
      } else {
        await api.post('/invoices', {
          clientId: txForm.clientId,
          amount: txForm.amount ? parseFloat(txForm.amount) : 0,
          issueDate: txForm.date,
          dueDate: txForm.dueDate,
          status: 'sent',
        });
      }
      setModalOpen(false);
      await loadDashboard();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setTxSaving(false);
    }
  };

  const unpaidCents = stats?.outstandingInvoices.reduce((sum, i) => sum + i.amountCents, 0) ?? 0;
  const revenueChange = stats ? pctChange(stats.currentMonth.revenueCents, stats.previousMonth.revenueCents) : null;
  const expensesChange = stats ? pctChange(stats.currentMonth.expensesCents, stats.previousMonth.expensesCents) : null;

  const metrics = stats
    ? [
        { label: 'Revenue', value: formatCents(stats.currentMonth.revenueCents), note: revenueChange!.note, noteTone: revenueChange!.tone },
        { label: 'Expenses', value: formatCents(stats.currentMonth.expensesCents), note: expensesChange!.note, noteTone: expensesChange!.tone },
        {
          label: 'Unpaid invoices',
          value: formatCents(unpaidCents),
          note: `${stats.outstandingInvoices.length} invoice${stats.outstandingInvoices.length === 1 ? '' : 's'} outstanding`,
          noteTone: 'muted' as const,
        },
        {
          label: 'Net cash',
          value: formatCents(stats.currentMonth.netProfitCents),
          note: stats.currentMonth.netProfitCents >= 0 ? 'Healthy for this period' : 'Running at a loss this period',
          noteTone: stats.currentMonth.netProfitCents >= 0 ? ('positive' as const) : ('negative' as const),
        },
      ]
    : [];

  const donutData = donutView === 'income' ? breakdown?.topIncome ?? [] : breakdown?.topExpense ?? [];
  const donutTotalCents = donutData.reduce((sum, d) => sum + d.totalCents, 0);

  return (
    <LedgerPage>
      <LedgerHeader
        title="Dashboard"
        description="A quick look at revenue, spend, and the work moving this month."
        action={
          <LedgerButton onClick={openAddTransaction} disabled={categories.length === 0 && clients.length === 0}>
            + Add transaction
          </LedgerButton>
        }
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      {loading || !stats || !breakdown ? (
        <p className="text-[12px] text-[#8b8f85]">Loading dashboard…</p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <LedgerStatCard key={metric.label} {...metric} />
            ))}
          </section>

          {payablesReceivables && (
            <section className="grid gap-3 md:grid-cols-2">
              <LedgerStatCard
                label="Total receivable"
                value={formatCents(payablesReceivables.receivables.totalCents)}
                note="Unpaid invoices"
                noteTone="muted"
              />
              <LedgerStatCard
                label="Total payable"
                value={formatCents(payablesReceivables.payables.totalCents)}
                note="Loans + salary dues"
                noteTone="negative"
              />
            </section>
          )}

          {accountSummary && (
            <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6] p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[16px] font-normal text-[#243830]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Chart of Accounts snapshot
                </h2>
                <p className="text-[11px] text-[#72776f]">From Bookkeeping entries</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[8px] bg-[#f6f4ec] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909388]">Total assets</p>
                  <p className="mt-1 text-[18px] font-semibold text-[#20352d]">{formatCents(accountSummary.totalAssetsCents)}</p>
                </div>
                <div className="rounded-[8px] bg-[#f6f4ec] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909388]">Total liabilities</p>
                  <p className="mt-1 text-[18px] font-semibold text-[#20352d]">{formatCents(accountSummary.totalLiabilitiesCents)}</p>
                </div>
                <div className="rounded-[8px] bg-[#f6f4ec] px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#909388]">Total capital / equity</p>
                  <p className="mt-1 text-[18px] font-semibold text-[#20352d]">{formatCents(accountSummary.totalEquityCents)}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-[#8b8f85]">
                Reflects transactions recorded on the Bookkeeping page — capital, loans, and assets tagged to a chart-of-accounts account. Everyday expenses/invoices logged elsewhere aren't required to be tagged, so this is a snapshot of what's been recorded there, not a full balance sheet.
              </p>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-[2.15fr_1fr]">
            <LedgerCard className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h2
                  className="text-[16px] font-normal text-[#243830]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Income vs Expense
                </h2>
                <p className="text-[11px] text-[#72776f]">last 12 months</p>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown.monthly} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} barGap={6}>
                    <CartesianGrid vertical={false} stroke="#ddd8cd" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#687068', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => formatCentsCompact(v)}
                      tick={{ fill: '#687068', fontSize: 11 }}
                    />
                    <Bar dataKey="incomeCents" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {breakdown.monthly.map((entry) => (
                        <Cell key={`inc-${entry.month}`} fill={entry.incomeCents > 0 ? '#0b5f43' : 'rgba(11,95,67,0)'} />
                      ))}
                    </Bar>
                    <Bar dataKey="expenseCents" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {breakdown.monthly.map((entry) => (
                        <Cell key={`exp-${entry.month}`} fill={entry.expenseCents > 0 ? '#d98f3d' : 'rgba(217,143,61,0)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-center gap-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-[#6f766e]">
                  <span className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#0b5f43]" /> Income
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-[#6f766e]">
                  <span className="inline-block h-2.5 w-2.5 rounded-[1px] bg-[#d98f3d]" /> Expense
                </span>
              </div>
            </LedgerCard>

            <LedgerCard className="p-5">
              <div className="mb-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDonutView('income')}
                  className={`text-[14px] font-normal ${donutView === 'income' ? 'text-[#0d6847]' : 'text-[#8b8f85]'}`}
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Top 5 Income
                </button>
                <button
                  type="button"
                  onClick={() => setDonutView('expense')}
                  className={`text-[14px] font-normal ${donutView === 'expense' ? 'text-[#0d6847]' : 'text-[#8b8f85]'}`}
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Expense
                </button>
              </div>
              <div
                className="h-[2px] w-6 rounded-full bg-[#0d6847] transition-transform"
                style={{ transform: donutView === 'expense' ? 'translateX(88px)' : 'translateX(0)' }}
              />

              {donutData.length === 0 ? (
                <p className="mt-8 text-[12px] text-[#8b8f85]">
                  No {donutView} recorded in the last 12 months yet.
                </p>
              ) : (
                <>
                  <div className="h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="totalCents"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {donutData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-[#46534c]">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                          />
                          {entry.name}
                        </span>
                        <span className="font-semibold text-[#20352d]">
                          {donutTotalCents > 0 ? Math.round((entry.totalCents / donutTotalCents) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </LedgerCard>
          </section>

          <LedgerTable headers={['Outstanding invoice', 'Client', 'Due', 'Status']}>
            {stats.outstandingInvoices.length === 0 ? (
              <LedgerEmptyRow colSpan={4}>Nothing outstanding — all invoices are settled.</LedgerEmptyRow>
            ) : (
              stats.outstandingInvoices.map((invoice) => (
                <LedgerRow key={invoice._id}>
                  <LedgerCell strong>{invoice.invoiceNumber}</LedgerCell>
                  <LedgerCell muted>
                    {typeof invoice.clientId === 'string' ? invoice.clientId : invoice.clientId.name}
                  </LedgerCell>
                  <LedgerCell muted>{invoice.dueDate.slice(0, 10)}</LedgerCell>
                  <LedgerCell>
                    <LedgerBadge tone={invoice.status === 'overdue' ? 'red' : 'yellow'}>{invoice.status}</LedgerBadge>
                  </LedgerCell>
                </LedgerRow>
              ))
            )}
          </LedgerTable>
        </>
      )}

      <LedgerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add transaction"
        description="Log money coming in or going out."
      >
        <form onSubmit={handleTxSubmit} className="space-y-4">
          {txError && <LedgerFormError>{txError}</LedgerFormError>}
          <LedgerField label="Type">
            <LedgerFormSelect
              options={[
                { value: 'expense', label: 'Expense (money out)' },
                { value: 'invoice', label: 'Invoice (money in)' },
              ]}
              value={txType}
              onChange={(e) => setTxType(e.target.value as TxType)}
            />
          </LedgerField>

          {txType === 'expense' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <LedgerField label="Date">
                  <LedgerInput
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  />
                </LedgerField>
                <LedgerField label="Amount (PKR)">
                  <LedgerInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  />
                </LedgerField>
              </div>
              <LedgerField label="Vendor">
                <LedgerInput
                  required
                  value={txForm.vendor}
                  onChange={(e) => setTxForm({ ...txForm, vendor: e.target.value })}
                />
              </LedgerField>
              <LedgerField label="Category">
                <LedgerFormSelect
                  required
                  options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  value={txForm.categoryId}
                  onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}
                />
              </LedgerField>
              {categories.length === 0 && (
                <p className="text-[11px] text-[#8b8f85]">Add a category first before logging an expense.</p>
              )}
            </>
          ) : (
            <>
              <LedgerField label="Client">
                <LedgerFormSelect
                  required
                  options={clients.map((c) => ({ value: c._id, label: c.name }))}
                  value={txForm.clientId}
                  onChange={(e) => setTxForm({ ...txForm, clientId: e.target.value })}
                />
              </LedgerField>
              {clients.length === 0 && (
                <p className="text-[11px] text-[#8b8f85]">Add a client first before creating an invoice.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <LedgerField label="Issue date">
                  <LedgerInput
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  />
                </LedgerField>
                <LedgerField label="Due date">
                  <LedgerInput
                    type="date"
                    required
                    value={txForm.dueDate}
                    onChange={(e) => setTxForm({ ...txForm, dueDate: e.target.value })}
                  />
                </LedgerField>
              </div>
              <LedgerField label="Amount (PKR)">
                <LedgerInput
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                />
              </LedgerField>
            </>
          )}

          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton
              type="submit"
              disabled={txSaving || (txType === 'expense' ? categories.length === 0 : clients.length === 0)}
            >
              {txSaving ? 'Saving…' : 'Add transaction'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
