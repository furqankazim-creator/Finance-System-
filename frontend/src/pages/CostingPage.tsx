import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  LedgerButton,
  LedgerCard,
  LedgerCell,
  LedgerEmptyRow,
  LedgerField,
  LedgerFormActions,
  LedgerFormError,
  LedgerHeader,
  LedgerInput,
  LedgerPage,
  LedgerRow,
  LedgerRowAction,
  LedgerTable,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents, formatCentsCompact } from '@/lib/money';
import type { CostRate, ProjectEstimate } from '@/lib/types';

const PROJECT_COLORS = ['#4C7FEF', '#FB7A4C', '#2FBF8F', '#F0B23E', '#EF6FAE', '#8B6FEF'];

interface SettingsFormState {
  monthlyOverhead: string;
  monthlyCapacityHours: string;
  defaultProfitMarginPct: string;
}

interface EstimateFormState {
  title: string;
  estimatedManHours: string;
  profitMarginPct: string;
  notes: string;
}

export default function CostingPage() {
  const [rate, setRate] = useState<CostRate | null>(null);
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    monthlyOverhead: '',
    monthlyCapacityHours: '',
    defaultProfitMarginPct: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [estimateForm, setEstimateForm] = useState<EstimateFormState>({
    title: '',
    estimatedManHours: '',
    profitMarginPct: '',
    notes: '',
  });
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [estimateError, setEstimateError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rateRes, estimatesRes] = await Promise.all([
        api.get('/costing/rate'),
        api.get('/costing/estimates'),
      ]);
      const rateData: CostRate = rateRes.data.data;
      setRate(rateData);
      setEstimates(estimatesRes.data.data);
      setSettingsForm({
        monthlyOverhead: (rateData.settings.monthlyOverheadCents / 100).toString(),
        monthlyCapacityHours: rateData.settings.monthlyCapacityHours.toString(),
        defaultProfitMarginPct: rateData.settings.defaultProfitMarginPct.toString(),
      });
      setEstimateForm((prev) => ({ ...prev, profitMarginPct: rateData.settings.defaultProfitMarginPct.toString() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load costing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setError('');
    try {
      await api.put('/costing/settings', {
        monthlyOverhead: settingsForm.monthlyOverhead ? parseFloat(settingsForm.monthlyOverhead) : 0,
        monthlyCapacityHours: settingsForm.monthlyCapacityHours ? parseFloat(settingsForm.monthlyCapacityHours) : 1,
        defaultProfitMarginPct: settingsForm.defaultProfitMarginPct ? parseFloat(settingsForm.defaultProfitMarginPct) : 0,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save costing settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleEstimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstimateSaving(true);
    setEstimateError('');
    try {
      const res = await api.post('/costing/estimates', {
        title: estimateForm.title,
        estimatedManHours: estimateForm.estimatedManHours ? parseFloat(estimateForm.estimatedManHours) : 0,
        profitMarginPct: estimateForm.profitMarginPct ? parseFloat(estimateForm.profitMarginPct) : undefined,
        notes: estimateForm.notes || undefined,
      });
      setEstimates((prev) => [res.data.data, ...prev]);
      setEstimateForm({
        title: '',
        estimatedManHours: '',
        profitMarginPct: rate?.settings.defaultProfitMarginPct.toString() ?? '30',
        notes: '',
      });
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : 'Failed to create estimate');
    } finally {
      setEstimateSaving(false);
    }
  };

  const handleDeleteEstimate = async (estimate: ProjectEstimate) => {
    if (!window.confirm(`Delete estimate "${estimate.title}"?`)) return;
    try {
      await api.delete(`/costing/estimates/${estimate._id}`);
      setEstimates((prev) => prev.filter((e) => e._id !== estimate._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete estimate');
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Costing"
        description="Monthly fixed cost → per-hour rate → project bid pricing."
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}

      {loading || !rate ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <LedgerCard className="p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly fixed cost
              </h2>
              <form onSubmit={handleSettingsSubmit} className="mt-4 space-y-4">
                <LedgerField label="Monthly organizational overhead (PKR) — rent, utilities, bills">
                  <LedgerInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.monthlyOverhead}
                    onChange={(e) => setSettingsForm({ ...settingsForm, monthlyOverhead: e.target.value })}
                  />
                </LedgerField>
                {rate.recordedOverheadCents > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                    <span>
                      Recorded in Bookkeeping this month (expense-type transactions): {' '}
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCents(rate.recordedOverheadCents)}</span>
                    </span>
                    <button
                      type="button"
                      className="ml-2 shrink-0 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      onClick={() => setSettingsForm({ ...settingsForm, monthlyOverhead: (rate.recordedOverheadCents / 100).toString() })}
                    >
                      Use this
                    </button>
                  </div>
                )}
                <LedgerField label="Monthly capacity hours (org-wide)">
                  <LedgerInput
                    type="number"
                    min="1"
                    step="1"
                    value={settingsForm.monthlyCapacityHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, monthlyCapacityHours: e.target.value })}
                  />
                </LedgerField>
                <LedgerField label="Default profit margin (%)">
                  <LedgerInput
                    type="number"
                    min="0"
                    step="1"
                    value={settingsForm.defaultProfitMarginPct}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultProfitMarginPct: e.target.value })}
                  />
                </LedgerField>
                <LedgerFormActions>
                  <LedgerButton type="submit" disabled={settingsSaving}>
                    {settingsSaving ? 'Saving…' : 'Save settings'}
                  </LedgerButton>
                </LedgerFormActions>
              </form>
            </LedgerCard>

            <LedgerCard className="p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Computed rate — this month
              </h2>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly overhead</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCents(rate.settings.monthlyOverheadCents)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly payroll cost (gross, this month)</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCents(rate.monthlyPayrollCostCents)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Total monthly fixed cost</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCents(rate.totalMonthlyCostCents)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly capacity hours</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{rate.settings.monthlyCapacityHours}</span>
                </div>
                <div className="mt-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3.5 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <div className="flex justify-between text-sm text-slate-900 dark:text-white">
                    <span className="font-medium">Per-hour cost</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCents(rate.perHourCostCents)} / hr</span>
                  </div>
                </div>
              </div>
            </LedgerCard>
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Where did we spend our hours? — total spend this month ÷ total office hours = per-hour cost (above).
              </p>
              <p className="text-xs text-slate-400">This month</p>
            </div>

            {rate.costByProject.length === 0 ? (
              <LedgerCard className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No expenses logged against a project yet this month.
              </LedgerCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <LedgerCard className="p-5">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Monthly cost by project
                  </h2>
                  <div className="mt-3 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rate.costByProject} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#ebe5da" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="projectName"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#687068', fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickMargin={8}
                          tickFormatter={(v) => formatCentsCompact(v)}
                          tick={{ fill: '#687068', fontSize: 10 }}
                        />
                        <Bar dataKey="totalCents" radius={[4, 4, 0, 0]} maxBarSize={44}>
                          {rate.costByProject.map((entry, index) => (
                            <Cell key={entry.projectName} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </LedgerCard>

                <LedgerCard className="p-5">
                  <h2 className="text-[15px] font-normal text-[#243830]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Project allocation %
                  </h2>
                  <div className="mt-1 h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rate.costByProject}
                          dataKey="totalCents"
                          nameKey="projectName"
                          innerRadius={46}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {rate.costByProject.map((entry, index) => (
                            <Cell key={entry.projectName} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {(() => {
                      const total = rate.costByProject.reduce((sum, p) => sum + p.totalCents, 0);
                      return rate.costByProject.map((entry, index) => (
                        <div key={entry.projectName} className="flex items-center gap-1.5 text-[11px] text-[#46534c]">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: PROJECT_COLORS[index % PROJECT_COLORS.length] }}
                          />
                          <span className="truncate">
                            {entry.projectName} ({total > 0 ? Math.round((entry.totalCents / total) * 100) : 0}%)
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </LedgerCard>
              </div>
            )}
          </section>

          <section className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6] p-5">
            <h2 className="text-[16px] font-normal text-[#243830]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Project estimate for proposal
            </h2>
            <p className="mt-1 text-[11px] text-[#72776f]">
              Final bid = (man-hours × per-hour cost) + profit margin.
            </p>
            {estimateError && <div className="mt-3"><LedgerFormError>{estimateError}</LedgerFormError></div>}
            <form onSubmit={handleEstimateSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
              <LedgerField label="Proposal title">
                <LedgerInput
                  required
                  value={estimateForm.title}
                  onChange={(e) => setEstimateForm({ ...estimateForm, title: e.target.value })}
                />
              </LedgerField>
              <LedgerField label="Estimated man-hours">
                <LedgerInput
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={estimateForm.estimatedManHours}
                  onChange={(e) => setEstimateForm({ ...estimateForm, estimatedManHours: e.target.value })}
                />
              </LedgerField>
              <LedgerField label="Profit margin (%)">
                <LedgerInput
                  type="number"
                  min="0"
                  step="1"
                  value={estimateForm.profitMarginPct}
                  onChange={(e) => setEstimateForm({ ...estimateForm, profitMarginPct: e.target.value })}
                />
              </LedgerField>
              <div className="flex items-end">
                <LedgerButton type="submit" disabled={estimateSaving} className="w-full">
                  {estimateSaving ? 'Calculating…' : 'Calculate & save'}
                </LedgerButton>
              </div>
            </form>

            {(() => {
              const hours = parseFloat(estimateForm.estimatedManHours);
              const margin = estimateForm.profitMarginPct !== ''
                ? parseFloat(estimateForm.profitMarginPct)
                : rate.settings.defaultProfitMarginPct;
              if (!hours || hours <= 0 || Number.isNaN(margin)) return null;
              const baseCentsPreview = Math.round(hours * rate.perHourCostCents);
              const finalCentsPreview = Math.round(baseCentsPreview * (1 + margin / 100));
              return (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-emerald-200/70 bg-emerald-50/50 px-3.5 py-2.5 text-xs text-slate-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Live preview</span>
                  <span>{hours} hrs × {formatCents(rate.perHourCostCents)}/hr = <span className="font-bold text-slate-900 dark:text-white">{formatCents(baseCentsPreview)}</span> base</span>
                  <span>+ {margin}% margin → <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCents(finalCentsPreview)}</span> final bid</span>
                </div>
              );
            })()}
          </section>

          <LedgerTable headers={['Title', 'Man-hours', 'Rate used', 'Base cost', 'Margin', 'Final bid', '']}>
            {estimates.length === 0 ? (
              <LedgerEmptyRow colSpan={7}>No saved estimates yet.</LedgerEmptyRow>
            ) : (
              estimates.map((estimate) => (
                <LedgerRow key={estimate._id}>
                  <LedgerCell strong>{estimate.title}</LedgerCell>
                  <LedgerCell muted>{estimate.estimatedManHours}</LedgerCell>
                  <LedgerCell muted>{formatCents(estimate.hourlyCostCentsUsed)}/hr</LedgerCell>
                  <LedgerCell muted>{formatCents(estimate.baseCostCents)}</LedgerCell>
                  <LedgerCell muted>{estimate.profitMarginPct}%</LedgerCell>
                  <LedgerCell className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCents(estimate.finalBidCostCents)}</LedgerCell>
                  <LedgerCell className="text-right">
                    <LedgerRowAction tone="danger" onClick={() => handleDeleteEstimate(estimate)}>
                      Delete
                    </LedgerRowAction>
                  </LedgerCell>
                </LedgerRow>
              ))
            )}
          </LedgerTable>
        </>
      )}
    </LedgerPage>
  );
}
