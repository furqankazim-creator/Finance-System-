import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import {
  LedgerPage,
  LedgerHeader,
  LedgerCard,
  LedgerButton,
  LedgerField,
  LedgerInput,
  LedgerTextarea,
  LedgerFormSelect,
  LedgerFormError,
  LedgerTable,
  LedgerRow,
  LedgerCell,
  LedgerBadge,
  LedgerModal,
  LedgerRowAction,
} from '@/components/app/ledger-ui';

interface OrgSettings {
  _id?: string;
  name: string;
  currency: string;
  fiscalYearStart: number;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  invoicePrefix?: string;
  paymentTermsDays?: number;
  partnerEmails?: string[];
  weeklyDigestEnabled?: boolean;
  monthlyDigestEnabled?: boolean;
  notes?: string;
}

interface TeamMember {
  _id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'accountant' | 'auditor' | 'viewer';
  createdAt?: string;
}

type SettingsTab = 'organization' | 'reports' | 'invoicing' | 'team' | 'security' | 'system';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Org form state
  const [formData, setFormData] = useState<OrgSettings>({
    name: '',
    currency: 'PKR',
    fiscalYearStart: 1,
    taxId: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Pakistan',
    invoicePrefix: 'INV-',
    paymentTermsDays: 30,
    partnerEmails: [],
    weeklyDigestEnabled: true,
    monthlyDigestEnabled: true,
    notes: '',
  });

  const [partnerEmailsInput, setPartnerEmailsInput] = useState('');

  // Password change state
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // System statistics
  const [systemStats, setSystemStats] = useState<{
    invoicesCount?: number;
    expensesCount?: number;
    clientsCount?: number;
    accountsCount?: number;
  }>({});

  // Team & RBAC state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'accountant' as 'admin' | 'accountant' | 'auditor' | 'viewer',
  });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [cronDispatching, setCronDispatching] = useState(false);
  const [cronStatusMsg, setCronStatusMsg] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgRes, invoicesRes, expensesRes, clientsRes, accountsRes, teamRes] = await Promise.allSettled([
        api.get('/organizations/me'),
        api.get('/invoices?limit=1'),
        api.get('/expenses?limit=1'),
        api.get('/clients?limit=1'),
        api.get('/accounts'),
        api.get('/organizations/team'),
      ]);

      if (orgRes.status === 'fulfilled' && orgRes.value.data.data) {
        const org = orgRes.value.data.data;
        setFormData({
          name: org.name || '',
          currency: org.currency || 'PKR',
          fiscalYearStart: org.fiscalYearStart || 1,
          taxId: org.taxId || '',
          email: org.email || '',
          phone: org.phone || '',
          address: org.address || '',
          city: org.city || '',
          country: org.country || 'Pakistan',
          invoicePrefix: org.invoicePrefix || 'INV-',
          paymentTermsDays: org.paymentTermsDays || 30,
          partnerEmails: org.partnerEmails || [],
          weeklyDigestEnabled: org.weeklyDigestEnabled ?? true,
          monthlyDigestEnabled: org.monthlyDigestEnabled ?? true,
          notes: org.notes || '',
        });
        setPartnerEmailsInput((org.partnerEmails || []).join(', '));
      }

      if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value.data?.data)) {
        setTeamMembers(teamRes.value.data.data);
      }

      setSystemStats({
        invoicesCount: invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.pagination?.total || 0 : 0,
        expensesCount: expensesRes.status === 'fulfilled' ? expensesRes.value.data?.pagination?.total || 0 : 0,
        clientsCount: clientsRes.status === 'fulfilled' ? clientsRes.value.data?.pagination?.total || 0 : 0,
        accountsCount: accountsRes.status === 'fulfilled' ? (accountsRes.value.data?.data || []).length : 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    if (!inviteForm.fullName.trim() || !inviteForm.email.trim() || !inviteForm.password) {
      setInviteError('Please fill in all required fields.');
      setInviteLoading(false);
      return;
    }

    if (inviteForm.password.length < 8) {
      setInviteError('Password must be at least 8 characters.');
      setInviteLoading(false);
      return;
    }

    try {
      const res = await api.post('/organizations/team/invite', inviteForm);
      setInviteSuccess(`Team member ${inviteForm.fullName} invited successfully!`);
      if (res.data?.data) {
        setTeamMembers((prev) => [...prev, res.data.data]);
      }
      setInviteForm({
        fullName: '',
        email: '',
        password: '',
        role: 'accountant',
      });
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteSuccess('');
      }, 1500);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || err.message || 'Failed to invite team member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'accountant' | 'auditor' | 'viewer') => {
    setRoleUpdatingId(userId);
    setError('');
    try {
      const res = await api.patch(`/organizations/team/${userId}/role`, { role: newRole });
      if (res.data?.data) {
        setTeamMembers((prev) =>
          prev.map((m) => (m._id === userId ? { ...m, role: res.data.data.role } : m))
        );
      }
      setSuccessMsg('Member role updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this organization?`)) {
      return;
    }
    try {
      await api.delete(`/organizations/team/${userId}`);
      setTeamMembers((prev) => prev.filter((m) => m._id !== userId));
      setSuccessMsg(`${name} has been removed from the team`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleTriggerCronDigest = async (type: 'weekly' | 'monthly') => {
    setCronDispatching(true);
    setCronStatusMsg('');
    try {
      const res = await api.post('/reports/dispatch-scheduled', { type });
      setCronStatusMsg(res.data?.message || `Scheduled ${type} digest dispatched successfully!`);
      setTimeout(() => setCronStatusMsg(''), 5000);
    } catch (err: any) {
      setCronStatusMsg(err.response?.data?.message || 'Failed to dispatch scheduled report');
    } finally {
      setCronDispatching(false);
    }
  };

  const handleOrgSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const parsedEmails = partnerEmailsInput
        .split(',')
        .map((em) => em.trim())
        .filter((em) => em.length > 0);

      const payload = {
        ...formData,
        partnerEmails: parsedEmails,
      };

      const res = await api.put('/organizations/me', payload);
      setSuccessMsg('Settings updated successfully!');
      if (res.data?.data) {
        setFormData((prev) => ({ ...prev, ...res.data.data }));
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setPwSaving(true);
    setPwError('');
    setPwSuccess('');

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPwError('New passwords do not match');
      setPwSaving(false);
      return;
    }

    if (passwordState.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long');
      setPwSaving(false);
      return;
    }

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordState.currentPassword,
        newPassword: passwordState.newPassword,
      });
      setPwSuccess('Password changed successfully!');
      setPasswordState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err: any) {
      setPwError(err.response?.data?.message || err.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const exportSystemData = () => {
    const backupObj = {
      exportedAt: new Date().toISOString(),
      organization: formData,
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
      },
      stats: systemStats,
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_system_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'organization', label: 'Organization & Profile', icon: '🏢' },
    { id: 'reports', label: 'Partner & Digest Reports', icon: '📊' },
    { id: 'invoicing', label: 'Invoicing & Defaults', icon: '🧾' },
    { id: 'team', label: 'Team & Roles (RBAC)', icon: '👥' },
    { id: 'security', label: 'Security & Access', icon: '🔒' },
    { id: 'system', label: 'System & Data', icon: '⚙️' },
  ];

  return (
    <LedgerPage className="max-w-[1080px]">
      <LedgerHeader
        title="System Control & Settings"
        description="Manage your organization profile, executive partner digests, invoicing rules, and software preferences."
        action={
          <div className="flex items-center gap-2">
            <LedgerButton variant="secondary" onClick={loadSettings} disabled={loading}>
              Refresh
            </LedgerButton>
            <LedgerButton onClick={handleOrgSubmit} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </LedgerButton>
          </div>
        }
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
          ✓ {successMsg}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <LedgerCard className="p-8 text-center text-sm text-slate-500">
          Loading system preferences and settings...
        </LedgerCard>
      ) : (
        <form onSubmit={handleOrgSubmit}>
          {/* TAB 1: ORGANIZATION & PROFILE */}
          {activeTab === 'organization' && (
            <div className="space-y-5">
              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-800">Organization Identity</h2>
                  <p className="text-xs text-slate-500">Primary legal and business registration details</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LedgerField label="Organization / Company Name">
                    <LedgerInput
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Acme Global Logistics Ltd"
                      required
                    />
                  </LedgerField>

                  <LedgerField label="National Tax ID / NTN / Registration Number">
                    <LedgerInput
                      value={formData.taxId || ''}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="e.g. 1234567-8"
                    />
                  </LedgerField>

                  <LedgerField label="Base Currency">
                    <LedgerFormSelect
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      options={[
                        { value: 'PKR', label: 'PKR - Pakistani Rupee (Rs)' },
                        { value: 'USD', label: 'USD - US Dollar ($)' },
                        { value: 'EUR', label: 'EUR - Euro (€)' },
                        { value: 'GBP', label: 'GBP - British Pound (£)' },
                        { value: 'AED', label: 'AED - UAE Dirham (AED)' },
                        { value: 'SAR', label: 'SAR - Saudi Riyal (SAR)' },
                        { value: 'CAD', label: 'CAD - Canadian Dollar ($)' },
                      ]}
                    />
                  </LedgerField>

                  <LedgerField label="Fiscal Year Start Month">
                    <LedgerFormSelect
                      value={String(formData.fiscalYearStart)}
                      onChange={(e) => setFormData({ ...formData, fiscalYearStart: Number(e.target.value) })}
                      options={[
                        { value: '1', label: 'January' },
                        { value: '4', label: 'April' },
                        { value: '7', label: 'July (Standard FY)' },
                        { value: '10', label: 'October' },
                      ]}
                    />
                  </LedgerField>
                </div>
              </LedgerCard>

              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white">Workspace Theme & Appearance</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose between light, dark, or system color preferences</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold transition-all ${
                      theme === 'light'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl">☀️</span>
                    <div className="text-left">
                      <p className="font-bold">Light Mode</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Clean executive alabaster</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold transition-all ${
                      theme === 'dark'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl">🌙</span>
                    <div className="text-left">
                      <p className="font-bold">Dark Mode</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Deep obsidian fintech slate</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold transition-all ${
                      theme === 'system'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl">💻</span>
                    <div className="text-left">
                      <p className="font-bold">System Sync</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Match OS preference</p>
                    </div>
                  </button>
                </div>
              </LedgerCard>

              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white">Contact & Physical Address</h2>
                  <p className="text-xs text-slate-500">Shown on official customer invoices and financial statements</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LedgerField label="Official Email">
                    <LedgerInput
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="billing@company.com"
                    />
                  </LedgerField>

                  <LedgerField label="Official Phone">
                    <LedgerInput
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+92 300 1234567"
                    />
                  </LedgerField>

                  <LedgerField label="Street Address" className="sm:col-span-2">
                    <LedgerInput
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Suite 400, Financial Tower, Main Boulevard"
                    />
                  </LedgerField>

                  <LedgerField label="City">
                    <LedgerInput
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Lahore / Karachi / Islamabad"
                    />
                  </LedgerField>

                  <LedgerField label="Country">
                    <LedgerInput
                      value={formData.country || 'Pakistan'}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Pakistan"
                    />
                  </LedgerField>
                </div>
              </LedgerCard>
            </div>
          )}

          {/* TAB 2: PARTNER & EXECUTIVE REPORT SETTINGS */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-800">Boss & Partner Executive Briefing Distribution</h2>
                  <p className="text-xs text-slate-500">
                    Configure the executive distribution list who receive scheduled financial briefings and audit digests.
                  </p>
                </div>

                <div className="space-y-4">
                  <LedgerField label="Executive Partner Email List (separated by commas)">
                    <LedgerInput
                      value={partnerEmailsInput}
                      onChange={(e) => setPartnerEmailsInput(e.target.value)}
                      placeholder="boss@company.com, partner1@investors.com, coo@company.com"
                    />
                    <span className="text-[11px] text-slate-500">
                      Weekly and monthly executive P&L, burn-rate, and cash flow reports will automatically target these addresses.
                    </span>
                  </LedgerField>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.weeklyDigestEnabled ?? true}
                        onChange={(e) => setFormData({ ...formData, weeklyDigestEnabled: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Weekly Partner Pulse</p>
                        <p className="text-[11px] text-slate-500">
                          Automated 7-day revenue, cash in/out, and open receivables delivered every Monday.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.monthlyDigestEnabled ?? true}
                        onChange={(e) => setFormData({ ...formData, monthlyDigestEnabled: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Monthly Comprehensive Board Report</p>
                        <p className="text-[11px] text-slate-500">
                          Full 30-day Profit & Loss statement, payroll summaries, and chart of accounts balance sheet.
                        </p>
                      </div>
                    </label>
                  </div>

                  <LedgerField label="Executive Briefing Disclaimer / Footer Note">
                    <LedgerTextarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Confidential financial briefing for directors and shareholders only. Generated by TGT Finance."
                    />
                  </LedgerField>
                </div>
              </LedgerCard>
            </div>
          )}

          {/* TAB 3: INVOICING & DEFAULTS */}
          {activeTab === 'invoicing' && (
            <div className="space-y-5">
              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-800">Invoicing Standards & Rules</h2>
                  <p className="text-xs text-slate-500">Automate default numbering, payment grace periods, and notes</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LedgerField label="Invoice Number Prefix">
                    <LedgerInput
                      value={formData.invoicePrefix || 'INV-'}
                      onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                      placeholder="e.g. INV-, TGT-2026-"
                    />
                  </LedgerField>

                  <LedgerField label="Default Payment Terms">
                    <LedgerFormSelect
                      value={String(formData.paymentTermsDays || 30)}
                      onChange={(e) => setFormData({ ...formData, paymentTermsDays: Number(e.target.value) })}
                      options={[
                        { value: '0', label: 'Due Upon Receipt' },
                        { value: '15', label: 'Net 15 Days' },
                        { value: '30', label: 'Net 30 Days (Standard)' },
                        { value: '45', label: 'Net 45 Days' },
                        { value: '60', label: 'Net 60 Days' },
                      ]}
                    />
                  </LedgerField>

                  <LedgerField label="Default Remittance / Wire Instructions" className="sm:col-span-2">
                    <LedgerTextarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Bank: Standard Chartered / HBL&#10;Account Title: Acme Pvt Ltd&#10;IBAN: PK36SCBL0000001123456701"
                    />
                  </LedgerField>
                </div>
              </LedgerCard>
            </div>
          )}

          {/* TAB: TEAM & ROLES (RBAC) */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <LedgerCard className="p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                      Team Members & Access Control (RBAC)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Invite finance team members and assign role-based permissions (Admin, Accountant, Auditor, Viewer).
                    </p>
                  </div>
                  <LedgerButton
                    type="button"
                    onClick={() => {
                      setInviteError('');
                      setInviteSuccess('');
                      setInviteModalOpen(true);
                    }}
                  >
                    ➕ Invite Team Member
                  </LedgerButton>
                </div>

                {teamMembers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No additional team members found.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Invite your accountants or auditors to collaborate on this organization.
                    </p>
                  </div>
                ) : (
                  <LedgerTable headers={['Member / Email', 'Current Role', 'Change Role', 'Joined Date', 'Actions']}>
                    {teamMembers.map((member) => {
                      const isSelf = member._id === user?.id;
                      const roleTone =
                        member.role === 'admin'
                          ? 'green'
                          : member.role === 'accountant'
                          ? 'yellow'
                          : 'neutral';

                      return (
                        <LedgerRow key={member._id}>
                          <LedgerCell strong>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-bold text-white shadow-sm">
                                {member.fullName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {member.fullName}
                                  </span>
                                  {isSelf && (
                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          </LedgerCell>

                          <LedgerCell>
                            <LedgerBadge tone={roleTone}>
                              {member.role === 'admin'
                                ? 'Admin (Full)'
                                : member.role === 'accountant'
                                ? 'Accountant'
                                : member.role === 'auditor'
                                ? 'Auditor'
                                : 'Viewer'}
                            </LedgerBadge>
                          </LedgerCell>

                          <LedgerCell>
                            <select
                              value={member.role}
                              disabled={isSelf || roleUpdatingId === member._id}
                              onChange={(e) =>
                                handleUpdateRole(
                                  member._id,
                                  e.target.value as 'admin' | 'accountant' | 'auditor' | 'viewer'
                                )
                              }
                              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="auditor">Auditor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </LedgerCell>

                          <LedgerCell muted>
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Active'}
                          </LedgerCell>

                          <LedgerCell>
                            {isSelf ? (
                              <span className="text-[11px] text-slate-400">Current Session</span>
                            ) : (
                              <LedgerRowAction
                                tone="danger"
                                onClick={() => handleRemoveMember(member._id, member.fullName)}
                              >
                                Remove
                              </LedgerRowAction>
                            )}
                          </LedgerCell>
                        </LedgerRow>
                      );
                    })}
                  </LedgerTable>
                )}
              </LedgerCard>

              {/* RBAC PERMISSION MATRIX EXPLANATION */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <LedgerCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Admin
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Full organizational control, team member invites, role promotion, system preferences, and cron scheduler dispatches.
                  </p>
                </LedgerCard>

                <LedgerCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Accountant
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Create and issue invoices, record business expenses, register bank accounts, and generate official client PDFs.
                  </p>
                </LedgerCard>

                <LedgerCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Auditor
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Read-only financial audit. Access to balance sheets, income statements, audit logs, and official A4 PDF downloads.
                  </p>
                </LedgerCard>

                <LedgerCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Viewer
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Restricted executive review. High-level dashboard metrics and summaries without access to operational modification.
                  </p>
                </LedgerCard>
              </div>

              {/* AUTOMATED BACKGROUND CRON SCHEDULER STATUS */}
              <LedgerCard className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Background Cron Engine & Digest Dispatcher
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Automated digests are scheduled on the server for executive partners and leadership.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LedgerButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleTriggerCronDigest('weekly')}
                      disabled={cronDispatching}
                    >
                      {cronDispatching ? 'Dispatching...' : '⚡ Test Weekly Digest'}
                    </LedgerButton>
                    <LedgerButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleTriggerCronDigest('monthly')}
                      disabled={cronDispatching}
                    >
                      {cronDispatching ? 'Dispatching...' : '⚡ Test Monthly Digest'}
                    </LedgerButton>
                  </div>
                </div>

                {cronStatusMsg && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ✓ {cronStatusMsg}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <span className="text-base">📅</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Weekly Digest (Mondays 09:00 AM)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Dispatches 7-day revenue, receivables due, and cash net change to registered partner emails.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-base">📊</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Monthly Digest (1st of Month 09:00 AM)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Compiles complete calendar month P&L statement, profit margin percentage, and tax liabilities.
                      </p>
                    </div>
                  </div>
                </div>
              </LedgerCard>
            </div>
          )}

          {/* TAB 4: SECURITY & ACCESS */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-800">User Credentials & Security</h2>
                  <p className="text-xs text-slate-500">Update your administrator password and protect access</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">Active Account</p>
                      <p className="text-slate-500">{user?.fullName} ({user?.email})</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                      Administrator
                    </span>
                  </div>
                </div>

                {pwError && <div className="mb-4"><LedgerFormError>{pwError}</LedgerFormError></div>}
                {pwSuccess && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
                    ✓ {pwSuccess}
                  </div>
                )}

                <div className="space-y-4 max-w-md">
                  <LedgerField label="Current Password">
                    <LedgerInput
                      type="password"
                      value={passwordState.currentPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </LedgerField>

                  <LedgerField label="New Password (min 8 chars)">
                    <LedgerInput
                      type="password"
                      value={passwordState.newPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </LedgerField>

                  <LedgerField label="Confirm New Password">
                    <LedgerInput
                      type="password"
                      value={passwordState.confirmPassword}
                      onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </LedgerField>

                  <LedgerButton
                    type="button"
                    onClick={handlePasswordSubmit}
                    disabled={pwSaving || !passwordState.currentPassword || !passwordState.newPassword}
                  >
                    {pwSaving ? 'Updating...' : 'Update Password'}
                  </LedgerButton>
                </div>
              </LedgerCard>
            </div>
          )}

          {/* TAB 5: SYSTEM & DATA */}
          {activeTab === 'system' && (
            <div className="space-y-5">
              <LedgerCard className="p-6">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h2 className="text-base font-semibold text-slate-800">Software Environment & Metrics</h2>
                  <p className="text-xs text-slate-500">Live operational data connected to MongoDB</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Invoices</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{systemStats.invoicesCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expenses</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{systemStats.expensesCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Clients</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{systemStats.clientsCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Accounts</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{systemStats.accountsCount ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Data Backup & Export</p>
                    <p className="text-[11px] text-slate-500">
                      Download a JSON snapshot of your organization profile and system configurations.
                    </p>
                  </div>
                  <LedgerButton type="button" variant="secondary" onClick={exportSystemData}>
                    📥 Export Settings JSON
                  </LedgerButton>
                </div>
              </LedgerCard>
            </div>
          )}

          {activeTab !== 'security' && activeTab !== 'team' && (
            <div className="flex justify-end gap-3 pt-3">
              <LedgerButton type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save All Changes'}
              </LedgerButton>
            </div>
          )}
        </form>
      )}

      {/* INVITE TEAM MEMBER MODAL */}
      <LedgerModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member"
        description="Add a colleague with dedicated role-based access to your organization's finance ledger."
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          {inviteError && <LedgerFormError>{inviteError}</LedgerFormError>}
          {inviteSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              ✓ {inviteSuccess}
            </div>
          )}

          <LedgerField label="Full Name">
            <LedgerInput
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              placeholder="e.g. Tariq Mehmood"
              required
            />
          </LedgerField>

          <LedgerField label="Work Email Address">
            <LedgerInput
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="tariq@example.com"
              required
            />
          </LedgerField>

          <LedgerField label="Initial Password (min 8 characters)">
            <LedgerInput
              type="password"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </LedgerField>

          <LedgerField label="Enterprise Role">
            <LedgerFormSelect
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  role: e.target.value as 'admin' | 'accountant' | 'auditor' | 'viewer',
                })
              }
              options={[
                { value: 'accountant', label: 'Accountant (Invoices, Expenses & Books)' },
                { value: 'auditor', label: 'Auditor (Read-Only Financial Records & PDF Exports)' },
                { value: 'viewer', label: 'Viewer (Read-Only Dashboard)' },
                { value: 'admin', label: 'Admin (Full Ledger & Team Management)' },
              ]}
            />
          </LedgerField>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <LedgerButton
              type="button"
              variant="secondary"
              onClick={() => setInviteModalOpen(false)}
              disabled={inviteLoading}
            >
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={inviteLoading}>
              {inviteLoading ? 'Creating Member...' : 'Create & Invite Member'}
            </LedgerButton>
          </div>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
