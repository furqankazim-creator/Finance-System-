import { useEffect, useState } from 'react';
import {
  LedgerBadge,
  LedgerButton,
  LedgerCard,
  LedgerField,
  LedgerFormActions,
  LedgerFormError,
  LedgerFormSelect,
  LedgerHeader,
  LedgerInput,
  LedgerModal,
  LedgerPage,
  LedgerProgress,
  LedgerRowAction,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { Client, DeleteImpact, Expense, Invoice, Project } from '@/lib/types';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusTone: Record<string, 'green' | 'yellow' | 'neutral'> = {
  active: 'green',
  'on-hold': 'yellow',
  completed: 'neutral',
  cancelled: 'neutral',
};

interface ProjectFormState {
  name: string;
  clientId: string;
  budget: string;
  status: string;
  description: string;
  startDate: string;
  endDate: string;
}

const emptyForm: ProjectFormState = {
  name: '',
  clientId: '',
  budget: '',
  status: 'active',
  description: '',
  startDate: '',
  endDate: '',
};

function clientName(clientId: Project['clientId']) {
  if (typeof clientId === 'string') return clientId;
  return clientId?.name ?? 'Unknown client';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projectsRes, clientsRes, expensesRes, invoicesRes] = await Promise.all([
        api.get('/projects?limit=100'),
        api.get('/clients?limit=100'),
        api.get('/expenses?limit=100'),
        api.get('/invoices?limit=100'),
      ]);
      setProjects(projectsRes.data.data);
      setClients(clientsRes.data.data);
      setExpenses(expensesRes.data.data);
      setInvoices(invoicesRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const projectIdOf = (ref: Expense['projectId'] | Invoice['projectId']) =>
    typeof ref === 'string' ? ref : ref?._id;

  const spentCentsFor = (projectId: string) =>
    expenses.filter((e) => projectIdOf(e.projectId) === projectId).reduce((sum, e) => sum + e.amountCents, 0);

  const billedCentsFor = (projectId: string) =>
    invoices
      .filter((i) => projectIdOf(i.projectId) === projectId && i.status !== 'cancelled')
      .reduce((sum, i) => sum + i.amountCents, 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, clientId: clients[0]?._id ?? '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({
      name: project.name,
      clientId: typeof project.clientId === 'string' ? project.clientId : project.clientId._id,
      budget: (project.budgetCents / 100).toString(),
      status: project.status,
      description: project.description ?? '',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (project: Project) => {
    try {
      const impactRes = await api.get(`/projects/${project._id}/dependencies`);
      const impact = impactRes.data.data as DeleteImpact;
      if (impact.blocked) {
        setError(impact.message);
        window.alert(impact.message);
        return;
      }

      if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;

      await api.delete(`/projects/${project._id}`);
      setProjects((prev) => prev.filter((p) => p._id !== project._id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        clientId: form.clientId,
        budget: form.budget ? parseFloat(form.budget) : 0,
        status: form.status,
        description: form.description || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      if (editing) {
        const res = await api.put(`/projects/${editing._id}`, payload);
        setProjects((prev) => prev.map((p) => (p._id === editing._id ? res.data.data : p)));
      } else {
        const res = await api.post('/projects', payload);
        setProjects((prev) => [...prev, res.data.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Projects"
        description="Every engagement, its budget, and how it's tracking."
        action={
          <LedgerButton onClick={openCreate} disabled={clients.length === 0}>
            + New project
          </LedgerButton>
        }
      />

      {error && <LedgerFormError>{error}</LedgerFormError>}
      {!loading && clients.length === 0 && (
        <p className="text-[12px] text-[#8b8f85]">Add a client first before creating a project.</p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <p className="text-[12px] text-[#8b8f85]">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="text-[12px] text-[#8b8f85]">No projects yet. Add your first one.</p>
        ) : (
          projects.map((project) => {
            const spentCents = spentCentsFor(project._id);
            const billedCents = billedCentsFor(project._id);
            const progress = project.budgetCents > 0 ? Math.min(100, Math.round((spentCents / project.budgetCents) * 100)) : 0;

            return (
              <LedgerCard key={project._id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className="text-[18px] leading-none text-[#2c4037]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {project.name}
                    </h2>
                    <p className="mt-1 text-[12px] text-[#6c726b]">{clientName(project.clientId)}</p>
                  </div>
                  <LedgerBadge tone={statusTone[project.status] ?? 'neutral'}>{project.status}</LedgerBadge>
                </div>

                <div className="mt-5 space-y-2 text-[12px]">
                  <div className="flex justify-between text-[#46534c]">
                    <span>Budget</span>
                    <span className="font-semibold">{formatCents(project.budgetCents)}</span>
                  </div>
                  <div className="flex justify-between text-[#46534c]">
                    <span>Spent</span>
                    <span className="font-semibold">{formatCents(spentCents)}</span>
                  </div>
                  <div className="flex justify-between text-[#46534c]">
                    <span>Billed</span>
                    <span className="font-semibold">{formatCents(billedCents)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <LedgerProgress value={progress} />
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <LedgerRowAction onClick={() => openEdit(project)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(project)}>
                    Delete
                  </LedgerRowAction>
                </div>
              </LedgerCard>
            );
          })
        )}
      </section>

      <LedgerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit project' : 'New project'}
        description="An engagement tied to a client and budget."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <LedgerField label="Name">
            <LedgerInput
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Client">
              <LedgerFormSelect
                required
                options={clients.map((c) => ({ value: c._id, label: c.name }))}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
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
          <LedgerField label="Budget (PKR)">
            <LedgerInput
              type="number"
              min="0"
              step="0.01"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Start date">
              <LedgerInput
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="End date">
              <LedgerInput
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
