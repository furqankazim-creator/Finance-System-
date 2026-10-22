import { useEffect, useState } from 'react';
import {
  LedgerBadge,
  LedgerButton,
  LedgerCell,
  LedgerCheckboxField,
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
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import type { Client, DeleteImpact } from '@/lib/types';

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: ClientFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  notes: '',
  isActive: true,
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients?limit=100');
      setClients(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      company: client.company ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
      isActive: client.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (client: Client) => {
    try {
      const impactRes = await api.get(`/clients/${client._id}/dependencies`);
      const impact = impactRes.data.data as DeleteImpact;
      if (impact.blocked) {
        setError(impact.message);
        window.alert(impact.message);
        return;
      }

      if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;

      await api.delete(`/clients/${client._id}`);
      setClients((prev) => prev.filter((c) => c._id !== client._id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        const res = await api.put(`/clients/${editing._id}`, payload);
        setClients((prev) => prev.map((c) => (c._id === editing._id ? res.data.data : c)));
      } else {
        const res = await api.post('/clients', payload);
        setClients((prev) => [...prev, res.data.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Clients"
        description="People and companies you bill."
        action={<LedgerButton onClick={openCreate}>+ New client</LedgerButton>}
      />

      <LedgerTable headers={['Name', 'Email', 'Phone', 'Company', 'Status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={6}>Loading clients…</LedgerEmptyRow>
        ) : clients.length === 0 ? (
          <LedgerEmptyRow colSpan={6}>No clients yet. Add your first one.</LedgerEmptyRow>
        ) : (
          clients.map((client) => (
            <LedgerRow key={client._id}>
              <LedgerCell strong>{client.name}</LedgerCell>
              <LedgerCell muted>{client.email || '—'}</LedgerCell>
              <LedgerCell muted>{client.phone || '—'}</LedgerCell>
              <LedgerCell>{client.company || '—'}</LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={client.isActive ? 'green' : 'neutral'}>
                  {client.isActive ? 'active' : 'inactive'}
                </LedgerBadge>
              </LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-3">
                  <LedgerRowAction onClick={() => openEdit(client)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(client)}>
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
        title={editing ? 'Edit client' : 'New client'}
        description="Who you bill for work."
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
            <LedgerField label="Email">
              <LedgerInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Phone">
              <LedgerInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Company">
            <LedgerInput
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Address">
            <LedgerInput
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Notes">
            <LedgerTextarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </LedgerField>
          <LedgerCheckboxField
            label="Active client"
            checked={form.isActive}
            onChange={(checked) => setForm({ ...form, isActive: checked })}
          />
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create client'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
