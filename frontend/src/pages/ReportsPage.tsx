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
  LedgerCell,
  LedgerEmptyRow,
  LedgerFormError,
  LedgerHeader,
  LedgerPage,
  LedgerRow,
  LedgerSectionTitle,
  LedgerSelect,
  LedgerStatCard,
  LedgerTable,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents, formatCentsCompact } from '@/lib/money';
import type { PLReport, Project } from '@/lib/types';

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

export default function ReportsPage() {
  const monthOptions = useMemo(() => monthOptionsForLastYear(), []);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [report, setReport] = useState<PLReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/projects?limit=100')
      .then((res) => setProjects(res.data.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [year, monthNum] = month.split('-').map(Number);
        const from = new Date(year, monthNum - 1, 1).toISOString();
        const to = new Date(year, monthNum, 0, 23, 59, 59).toISOString();
        const params = new URLSearchParams({ from, to });
        if (projectId) params.set('projectId', projectId);
        const res = await api.get(`/reports/pl?${params.toString()}`);
        setReport(res.data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [month, projectId]);

  const previousMonth = report && report.monthlyComparison.length >= 2
    ? report.monthlyComparison[report.monthlyComparison.length - 2]
    : null;

  const pctChange = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return { note: `${sign}${pct.toFixed(1)}% vs previous`, tone: pct >= 0 ? ('positive' as const) : ('negative' as const) };
  };

  const categoryRows = report
    ? [
        ...report.cogs.byCategory.map((c) => ({ ...c, type: 'COGS' })),
        ...report.opex.byCategory.map((c) => ({ ...c, type: 'OPEX' })),
      ].sort((a, b) => b.totalCents - a.totalCents)
    : [];

  return (
    <LedgerPage>
      <LedgerHeader
        title="P&L Report"
        description="Revenue minus cost of goods and operating expenses."
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      <section className="flex flex-wrap gap-3">
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b8f85]">
            Month
          </p>
          <LedgerSelect value={month} onChange={setMonth} options={monthOptions} />
        </div>
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b8f85]">
            Project
          </p>
          <LedgerSelect
            value={projectId}
            onChange={setProjectId}
            options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p._id, label: p.name }))]}
          />
        </div>
      </section>

      {loading || !report ? (
        <p className="text-[12px] text-[#8b8f85]">Loading report…</p>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <LedgerStatCard
              label="Revenue"
              value={formatCents(report.revenue.totalCents)}
              note={pctChange(report.revenue.totalCents, previousMonth?.revenueCents)?.note ?? 'No prior period data'}
              noteTone={pctChange(report.revenue.totalCents, previousMonth?.revenueCents)?.tone ?? 'muted'}
            />
            <LedgerStatCard
              label="Cost of goods sold"
              value={formatCents(report.cogs.totalCents)}
              note="This period"
              noteTone="muted"
            />
            <LedgerStatCard
              label="Operating expenses"
              value={formatCents(report.opex.totalCents)}
              note="This period"
              noteTone="muted"
            />
            <LedgerStatCard
              label="Net profit"
              value={formatCents(report.netProfit)}
              note={pctChange(report.netProfit, previousMonth?.netProfitCents)?.note ?? 'No prior period data'}
              noteTone={pctChange(report.netProfit, previousMonth?.netProfitCents)?.tone ?? 'muted'}
            />
          </section>

          <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6]">
            <LedgerSectionTitle>By category · this period</LedgerSectionTitle>
            <div className="px-4 py-5">
              {categoryRows.length === 0 ? (
                <p className="text-[12px] text-[#8b8f85]">No categorized expenses in this period.</p>
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
                        width={124}
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
                <LedgerEmptyRow colSpan={3}>No categorized expenses in this period.</LedgerEmptyRow>
              ) : (
                categoryRows.map((row) => (
                  <LedgerRow key={row.categoryName}>
                    <LedgerCell strong>{row.categoryName}</LedgerCell>
                    <LedgerCell muted>{row.type}</LedgerCell>
                    <LedgerCell className="font-semibold text-[#364941]">{formatCents(row.totalCents)}</LedgerCell>
                  </LedgerRow>
                ))
              )}
            </LedgerTable>
          </section>
        </>
      )}
    </LedgerPage>
  );
}
