import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  LedgerHeader,
  LedgerInput,
  LedgerModal,
  LedgerPage,
  LedgerRow,
  LedgerSectionTitle,
  LedgerSelect,
  LedgerStatCard,
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents, formatCentsCompact } from '@/lib/money';
import type { PLReport, Project, ExecutiveReportData } from '@/lib/types';

function monthOptionsForLastYear() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

function weekOptionsForRecent() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const value = mon.toISOString().slice(0, 10);
    const label =
      i === 0
        ? `This Week (${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        : i === 1
        ? `Last Week (${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        : `Week of ${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    options.push({ value, label });
  }
  return options;
}

export default function ReportsPage() {
  const monthOptions = useMemo(() => monthOptionsForLastYear(), []);
  const weekOptions = useMemo(() => weekOptionsForRecent(), []);

  // View mode: Executive Partner Report vs P&L Statement
  const [activeTab, setActiveTab] = useState<'executive' | 'pl'>('executive');

  // Executive Report state
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0].value);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [execData, setExecData] = useState<ExecutiveReportData | null>(null);
  const [execLoading, setExecLoading] = useState(true);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipients, setRecipients] = useState('boss@tgtfinance.com, partner@tgtfinance.com');
  const [customMessage, setCustomMessage] = useState(
    'Please find attached our financial summary for leadership review.'
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('');

  // P&L Report state
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [plReport, setPLReport] = useState<PLReport | null>(null);
  const [plLoading, setPLLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch projects
  useEffect(() => {
    api
      .get('/projects?limit=100')
      .then((res) => setProjects(res.data.data))
      .catch(() => undefined);
  }, []);

  // Fetch Executive Report
  const loadExecutiveReport = async () => {
    setExecLoading(true);
    setError('');
    try {
      const dateParam = periodType === 'weekly' ? selectedWeek : `${selectedMonth}-01`;
      const res = await api.get(
        `/reports/executive?periodType=${periodType}&date=${dateParam}`
      );
      setExecData(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executive report');
    } finally {
      setExecLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'executive') {
      loadExecutiveReport();
    }
  }, [activeTab, periodType, selectedWeek, selectedMonth]);

  // Fetch P&L Report
  useEffect(() => {
    if (activeTab === 'pl') {
      (async () => {
        setPLLoading(true);
        setError('');
        try {
          const [year, monthNum] = selectedMonth.split('-').map(Number);
          const from = new Date(year, monthNum - 1, 1).toISOString();
          const to = new Date(year, monthNum, 0, 23, 59, 59).toISOString();
          const params = new URLSearchParams({ from, to });
          if (projectId) params.set('projectId', projectId);
          const res = await api.get(`/reports/pl?${params.toString()}`);
          setPLReport(res.data.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load P&L report');
        } finally {
          setPLLoading(false);
        }
      })();
    }
  }, [activeTab, selectedMonth, projectId]);

  // Handle Send Email to Boss & Partners
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setError('');
    setEmailSuccessMessage('');
    try {
      const dateParam = periodType === 'weekly' ? selectedWeek : `${selectedMonth}-01`;
      const res = await api.post('/reports/send-summary', {
        recipients,
        periodType,
        date: dateParam,
        customMessage: customMessage || undefined,
      });
      setEmailSuccessMessage(res.data.message || 'Report dispatched successfully');
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSuccessMessage('');
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send report email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryRows = plReport
    ? [
        ...plReport.cogs.byCategory.map((c) => ({ ...c, type: 'COGS' })),
        ...plReport.opex.byCategory.map((c) => ({ ...c, type: 'OPEX' })),
      ].sort((a, b) => b.totalCents - a.totalCents)
    : [];

  const formatPctChange = (pct: number | null, inverse = false) => {
    if (pct === null) return { text: 'No prior data', tone: 'muted' as const };
    const sign = pct >= 0 ? '+' : '';
    const text = `${sign}${pct}% vs prev period`;
    const isPositive = inverse ? pct <= 0 : pct >= 0;
    return { text, tone: isPositive ? ('positive' as const) : ('negative' as const) };
  };

  return (
    <LedgerPage>
      {/* Header */}
      <div className="no-print">
        <LedgerHeader
          title="Financial Reports"
          description="Weekly and monthly financial intelligence prepared for company leadership and business partners."
          action={
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <LedgerButton
                variant="secondary"
                onClick={() => {
                  setError('');
                  setEmailModalOpen(true);
                }}
              >
                ✉ Email Boss & Partners
              </LedgerButton>
              <LedgerButton variant="secondary" onClick={handlePrint}>
                ⎙ Print / Save PDF
              </LedgerButton>
            </div>
          }
        />
      </div>

      {error && !emailModalOpen && <LedgerFormError>{error}</LedgerFormError>}

      {/* View Mode Toggle: Executive Briefing vs P&L Statement */}
      <div className="no-print flex items-center justify-between border-b border-[#ded8cd] pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('executive')}
            className={`rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              activeTab === 'executive'
                ? 'bg-[#0b6b48] text-[#f4f1e8] shadow-sm'
                : 'text-[#49544d] hover:bg-[#ece6da]'
            }`}
          >
            Executive Partner Briefing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pl')}
            className={`rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              activeTab === 'pl'
                ? 'bg-[#0b6b48] text-[#f4f1e8] shadow-sm'
                : 'text-[#49544d] hover:bg-[#ece6da]'
            }`}
          >
            P&L Detailed Statement
          </button>
        </div>

        {/* Period selection depending on active tab */}
        {activeTab === 'executive' && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-[7px] border border-[#ddd7cc] bg-[#fbfaf6] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`rounded-[5px] px-2.5 py-1 font-medium transition ${
                  periodType === 'weekly'
                    ? 'bg-[#0b6b48] text-[#f4f1e8]'
                    : 'text-[#49544d] hover:bg-[#eee8dc]'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`rounded-[5px] px-2.5 py-1 font-medium transition ${
                  periodType === 'monthly'
                    ? 'bg-[#0b6b48] text-[#f4f1e8]'
                    : 'text-[#49544d] hover:bg-[#eee8dc]'
                }`}
              >
                Monthly
              </button>
            </div>

            {periodType === 'weekly' ? (
              <LedgerSelect
                value={selectedWeek}
                onChange={setSelectedWeek}
                options={weekOptions}
              />
            ) : (
              <LedgerSelect
                value={selectedMonth}
                onChange={setSelectedMonth}
                options={monthOptions}
              />
            )}
          </div>
        )}

        {activeTab === 'pl' && (
          <div className="flex items-center gap-2">
            <LedgerSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              options={monthOptions}
            />
            <LedgerSelect
              value={projectId}
              onChange={setProjectId}
              options={[
                { value: '', label: 'All projects' },
                ...projects.map((p) => ({ value: p._id, label: p.name })),
              ]}
            />
          </div>
        )}
      </div>

      {/* ────────────────── EXECUTIVE PARTNER BRIEFING VIEW ────────────────── */}
      {activeTab === 'executive' && (
        <>
          {execLoading || !execData ? (
            <p className="py-8 text-center text-[13px] text-[#8b8f85]">
              Compiling executive partner summary…
            </p>
          ) : (
            <div className="space-y-5">
              {/* Executive Header Banner */}
              <div className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b8f85]">
                      CONFIDENTIAL PARTNER BRIEFING · {execData.periodType.toUpperCase()}
                    </p>
                    <h2
                      className="mt-1 text-[22px] leading-tight text-[#1f352c]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {execData.orgName}
                    </h2>
                    <p className="mt-1 text-[13px] text-[#6c726c]">
                      Performance for {execData.periodLabel} · Currency:{' '}
                      <span className="font-semibold text-[#1f352c]">{execData.currency}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <LedgerBadge tone={execData.netProfitCents >= 0 ? 'green' : 'red'}>
                      {execData.netMarginPct}% Net Margin
                    </LedgerBadge>
                    <LedgerBadge tone="neutral">
                      {periodType === 'weekly' ? 'Weekly Digest' : 'Monthly Digest'}
                    </LedgerBadge>
                  </div>
                </div>
              </div>

              {/* 4 Primary Executive KPIs */}
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <LedgerStatCard
                  label="Total Revenue"
                  value={formatCents(execData.revenueCents, execData.currency)}
                  note={formatPctChange(execData.revenueChangePct).text}
                  noteTone={formatPctChange(execData.revenueChangePct).tone}
                />
                <LedgerStatCard
                  label="Total Expenses"
                  value={formatCents(execData.expensesCents, execData.currency)}
                  note={formatPctChange(execData.expensesChangePct, true).text}
                  noteTone={formatPctChange(execData.expensesChangePct, true).tone}
                />
                <LedgerStatCard
                  label="Net Profit"
                  value={formatCents(execData.netProfitCents, execData.currency)}
                  note={formatPctChange(execData.netProfitChangePct).text}
                  noteTone={formatPctChange(execData.netProfitChangePct).tone}
                />
                <LedgerStatCard
                  label="Cash in Bank"
                  value={formatCents(execData.cashInBankCents, execData.currency)}
                  note="Active bank reserves"
                  noteTone="positive"
                />
              </section>

              {/* Working Capital & Operational Position */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Receivables Card */}
                <LedgerCard className="p-5">
                  <div className="flex items-center justify-between border-b border-[#e5dfd3] pb-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8f85]">
                        ACCOUNTS RECEIVABLE
                      </p>
                      <p
                        className="mt-1 text-[20px] font-bold text-[#1f352c]"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {formatCents(execData.receivables.totalCents, execData.currency)}
                      </p>
                    </div>
                    <LedgerBadge tone={execData.receivables.overdueCount > 0 ? 'yellow' : 'green'}>
                      {execData.receivables.openCount} Open Invoices
                    </LedgerBadge>
                  </div>

                  <div className="mt-4 space-y-2.5 text-[12.5px]">
                    <div className="flex justify-between text-[#49544d]">
                      <span>Overdue from Clients</span>
                      <span className="font-semibold text-[#c2555f]">
                        {formatCents(execData.receivables.overdueCents, execData.currency)} (
                        {execData.receivables.overdueCount} invoices)
                      </span>
                    </div>
                    <div className="flex justify-between text-[#49544d]">
                      <span>Invoices Billed this period</span>
                      <span className="font-medium">
                        {formatCents(execData.invoicesBilledTotalCents, execData.currency)} (
                        {execData.invoicesBilledCount} billed)
                      </span>
                    </div>
                    <div className="flex justify-between text-[#49544d]">
                      <span>Expected Collection Status</span>
                      <span className="text-[#2c9a74]">
                        {execData.receivables.overdueCount === 0
                          ? 'Healthy · All on schedule'
                          : 'Attention needed on overdue'}
                      </span>
                    </div>
                  </div>
                </LedgerCard>

                {/* Payables Card */}
                <LedgerCard className="p-5">
                  <div className="flex items-center justify-between border-b border-[#e5dfd3] pb-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b8f85]">
                        ACCOUNTS PAYABLE & LIABILITIES
                      </p>
                      <p
                        className="mt-1 text-[20px] font-bold text-[#1f352c]"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {formatCents(execData.payables.totalCents, execData.currency)}
                      </p>
                    </div>
                    <LedgerBadge tone="neutral">Upcoming obligations</LedgerBadge>
                  </div>

                  <div className="mt-4 space-y-2.5 text-[12.5px]">
                    <div className="flex justify-between text-[#49544d]">
                      <span>Pending Staff Salaries</span>
                      <span className="font-semibold text-[#31443c]">
                        {formatCents(execData.payables.pendingPayrollCents, execData.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#49544d]">
                      <span>Active Bank Loans & Debt</span>
                      <span className="font-semibold text-[#31443c]">
                        {formatCents(execData.payables.openLoansCents, execData.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#49544d]">
                      <span>Liquidity Coverage Ratio</span>
                      <span
                        className={
                          execData.cashInBankCents >= execData.payables.totalCents
                            ? 'font-medium text-[#2c9a74]'
                            : 'font-medium text-[#c2555f]'
                        }
                      >
                        {execData.payables.totalCents > 0
                          ? `${(
                              (execData.cashInBankCents / execData.payables.totalCents) *
                              100
                            ).toFixed(0)}% coverage`
                          : 'Fully covered'}
                      </span>
                    </div>
                  </div>
                </LedgerCard>
              </div>

              {/* Top Expense Drivers Table */}
              <div className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
                <LedgerSectionTitle>
                  Top Spending Drivers · {execData.periodLabel}
                </LedgerSectionTitle>
                <LedgerTable headers={['Expense Category', 'Share of Spend', 'Amount spent']}>
                  {execData.topExpenses.length === 0 ? (
                    <LedgerEmptyRow colSpan={3}>
                      No expenses recorded during this period.
                    </LedgerEmptyRow>
                  ) : (
                    execData.topExpenses.map((c) => (
                      <LedgerRow key={c.categoryName}>
                        <LedgerCell strong>{c.categoryName}</LedgerCell>
                        <LedgerCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-[#e8e2d5]">
                              <div
                                className="h-full rounded-full bg-[#0b6b48]"
                                style={{ width: `${Math.min(100, c.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-[#787d75]">{c.percentage}%</span>
                          </div>
                        </LedgerCell>
                        <LedgerCell className="font-semibold text-[#31443c]">
                          {formatCents(c.totalCents, execData.currency)}
                        </LedgerCell>
                      </LedgerRow>
                    ))
                  )}
                </LedgerTable>
              </div>
            </div>
          )}
        </>
      )}

      {/* ────────────────── DETAILED P&L STATEMENT VIEW ────────────────── */}
      {activeTab === 'pl' && (
        <>
          {plLoading || !plReport ? (
            <p className="py-8 text-center text-[13px] text-[#8b8f85]">Loading P&L statement…</p>
          ) : (
            <div className="space-y-5">
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <LedgerStatCard
                  label="Revenue"
                  value={formatCents(plReport.revenue.totalCents)}
                  note="This period"
                  noteTone="positive"
                />
                <LedgerStatCard
                  label="Cost of goods sold"
                  value={formatCents(plReport.cogs.totalCents)}
                  note="This period"
                  noteTone="muted"
                />
                <LedgerStatCard
                  label="Operating expenses"
                  value={formatCents(plReport.opex.totalCents)}
                  note="This period"
                  noteTone="muted"
                />
                <LedgerStatCard
                  label="Net profit"
                  value={formatCents(plReport.netProfit)}
                  note={plReport.netProfit >= 0 ? 'Profitable period' : 'Net deficit'}
                  noteTone={plReport.netProfit >= 0 ? 'positive' : 'negative'}
                />
              </section>

              <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
                <LedgerSectionTitle>By category · this period</LedgerSectionTitle>
                <div className="px-4 py-5">
                  {categoryRows.length === 0 ? (
                    <p className="text-[12px] text-[#8b8f85]">
                      No categorized expenses in this period.
                    </p>
                  ) : (
                    <div className="h-[320px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryRows}
                          layout="vertical"
                          margin={{ top: 6, right: 16, left: 18, bottom: 8 }}
                          barCategoryGap={16}
                        >
                          <CartesianGrid stroke="#ddd8cd" strokeDasharray="3 3" horizontal={false} />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                            tick={{ fill: '#6d746d', fontSize: 11 }}
                            tickFormatter={(v) => formatCentsCompact(v)}
                          />
                          <YAxis
                            type="category"
                            dataKey="categoryName"
                            width={130}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6d746d', fontSize: 11 }}
                          />
                          <Bar dataKey="totalCents" radius={[0, 4, 4, 0]} barSize={14}>
                            {categoryRows.map((row) => (
                              <Cell key={row.categoryName} fill={row.color || '#0b5f43'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-2 text-[11px] text-[#787d75]">Category detail</div>
                <LedgerTable headers={['Category', 'Type', 'Total']} compact>
                  {categoryRows.length === 0 ? (
                    <LedgerEmptyRow colSpan={3}>
                      No categorized expenses in this period.
                    </LedgerEmptyRow>
                  ) : (
                    categoryRows.map((row) => (
                      <LedgerRow key={row.categoryName}>
                        <LedgerCell strong>{row.categoryName}</LedgerCell>
                        <LedgerCell muted>{row.type}</LedgerCell>
                        <LedgerCell className="font-semibold text-[#364941]">
                          {formatCents(row.totalCents)}
                        </LedgerCell>
                      </LedgerRow>
                    ))
                  )}
                </LedgerTable>
              </section>
            </div>
          )}
        </>
      )}

      {/* ────────────────── EMAIL DISPATCH MODAL ────────────────── */}
      <LedgerModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Email Financial Report to Leadership"
        description="Dispatch a beautifully formatted executive financial digest directly to your boss and business partners."
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          {emailSuccessMessage && (
            <div className="rounded-[8px] border border-[#a7f3d0] bg-[#ecfdf5] p-3 text-[12.5px] text-[#065f46]">
              ✓ {emailSuccessMessage}
            </div>
          )}

          <LedgerField label="Recipients (comma-separated emails)">
            <LedgerInput
              required
              type="text"
              placeholder="e.g. boss@company.com, partner@company.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </LedgerField>

          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Period format">
              <div className="rounded-[7px] border border-[#ddd7cc] bg-[#f5f2ea] px-3 py-2 text-[12px] font-medium text-[#31443c]">
                {periodType === 'weekly' ? 'Weekly Digest' : 'Monthly Digest'}
              </div>
            </LedgerField>
            <LedgerField label="Selected time window">
              <div className="truncate rounded-[7px] border border-[#ddd7cc] bg-[#f5f2ea] px-3 py-2 text-[12px] font-medium text-[#31443c]">
                {execData?.periodLabel || 'Active period'}
              </div>
            </LedgerField>
          </div>

          <LedgerField label="Executive note (optional)">
            <LedgerTextarea
              rows={3}
              placeholder="Add any specific context or remarks for your boss and partners…"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </LedgerField>

          <LedgerFormActions>
            <LedgerButton
              variant="secondary"
              type="button"
              onClick={() => setEmailModalOpen(false)}
            >
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={sendingEmail || !recipients.trim()}>
              {sendingEmail ? 'Sending digest…' : 'Send executive report'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
