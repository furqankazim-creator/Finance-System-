import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
import { useTheme } from '@/lib/theme-context';
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

const DONUT_COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
        <p className="font-semibold text-slate-300">{label}</p>
        <div className="mt-1.5 space-y-1">
          {payload.map((p: any) => (
            <div key={p.name || p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                {p.dataKey === 'incomeCents' ? 'Income' : p.dataKey === 'expenseCents' ? 'Expense' : p.name}
              </span>
              <span className="font-semibold text-white tabular-nums">
                {formatCents(p.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

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
  const { actualTheme } = useTheme();
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
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading dashboard…</p>
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
            <LedgerCard className="p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Chart of Accounts Snapshot
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Live operational totals from general ledger</p>
                </div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Bookkeeping Synced
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Assets</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">{formatCents(accountSummary.totalAssetsCents)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Liabilities</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-rose-700 dark:text-rose-400 tabular-nums">{formatCents(accountSummary.totalLiabilitiesCents)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Capital / Equity</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCents(accountSummary.totalEquityCents)}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Reflects transactions recorded on the Bookkeeping ledger — capital, loans, and assets tagged to a chart-of-accounts balance.
              </p>
            </LedgerCard>
          )}

          <section className="grid gap-5 xl:grid-cols-[2.15fr_1fr]">
            <LedgerCard className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Income vs Expense
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trailing 12 months financial trajectory</p>
                </div>
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                  Monthly Performance
                </span>
              </div>

              <div className="h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown.monthly} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={6}>
                    <defs>
                      <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={actualTheme === 'dark' ? '#1e293b' : '#f1f5f9'} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: actualTheme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => formatCentsCompact(v)}
                      tick={{ fill: actualTheme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="incomeCents" fill="url(#incomeBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expenseCents" fill="url(#expenseBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="inline-block h-3 w-3 rounded-md bg-emerald-600 shadow-sm shadow-emerald-600/30" /> Income
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="inline-block h-3 w-3 rounded-md bg-amber-500 shadow-sm shadow-amber-500/30" /> Expense
                </span>
              </div>
            </LedgerCard>

            <LedgerCard className="p-6 flex flex-col justify-between">
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setDonutView('income')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      donutView === 'income'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Top Revenue
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonutView('expense')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      donutView === 'expense'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Top Spend
                  </button>
                </div>

                {donutData.length === 0 ? (
                  <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No {donutView} recorded in the last 12 months yet.
                  </p>
                ) : (
                  <>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="totalCents"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                          >
                            {donutData.map((entry, index) => (
                              <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {donutData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
                          <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium truncate max-w-[150px]">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                            {donutTotalCents > 0 ? Math.round((entry.totalCents / donutTotalCents) * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
                <p className="text-xs text-amber-600 dark:text-amber-400">Add a category first before logging an expense.</p>
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
                <p className="text-xs text-amber-600 dark:text-amber-400">Add a client first before creating an invoice.</p>
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
