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
  LedgerFormSelect,
  LedgerHeader,
  LedgerInput,
  LedgerModal,
  LedgerPage,
  LedgerRow,
  LedgerRowAction,
  LedgerTable,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import type { DeleteImpact, ExpenseCategory } from '@/lib/types';

const typeOptions = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
  { value: 'cogs', label: 'COGS' },
  { value: 'opex', label: 'OPEX' },
  { value: 'revenue', label: 'Revenue' },
];

interface CategoryFormState {
  name: string;
  type: string;
  color: string;
  isActive: boolean;
}

const emptyForm: CategoryFormState = { name: '', type: 'opex', color: '#6366f1', isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (category: ExpenseCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color ?? '#6366f1',
      isActive: category.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (category: ExpenseCategory) => {
    try {
      const impactRes = await api.get(`/categories/${category._id}/dependencies`);
      const impact = impactRes.data.data as DeleteImpact;
      if (impact.blocked) {
        setError(impact.message);
        window.alert(impact.message);
        return;
      }

      if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;

      await api.delete(`/categories/${category._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== category._id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, type: form.type, color: form.color, isActive: form.isActive };
      if (editing) {
        const res = await api.put(`/categories/${editing._id}`, payload);
        setCategories((prev) => prev.map((c) => (c._id === editing._id ? res.data.data : c)));
      } else {
        const res = await api.post('/categories', payload);
        setCategories((prev) => [...prev, res.data.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Categories"
        description="Organize spending buckets and reporting groups."
        action={<LedgerButton onClick={openCreate}>+ New category</LedgerButton>}
      />

      <LedgerTable headers={['Category', 'Type', 'Color', 'Status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={5}>Loading categories…</LedgerEmptyRow>
        ) : categories.length === 0 ? (
          <LedgerEmptyRow colSpan={5}>No categories yet. Add your first one.</LedgerEmptyRow>
        ) : (
          categories.map((category) => (
            <LedgerRow key={category._id}>
              <LedgerCell strong>{category.name}</LedgerCell>
              <LedgerCell muted className="uppercase">{category.type}</LedgerCell>
              <LedgerCell>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: category.color || '#6366f1' }}
                  />
                  {category.color || '#6366f1'}
                </span>
              </LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={category.isActive ? 'green' : 'neutral'}>
                  {category.isActive ? 'active' : 'inactive'}
                </LedgerBadge>
              </LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-3">
                  <LedgerRowAction onClick={() => openEdit(category)}>Edit</LedgerRowAction>
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(category)}>
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
        title={editing ? 'Edit category' : 'New category'}
        description="A bucket for grouping expenses."
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
            <LedgerField label="Type">
              <LedgerFormSelect
                options={typeOptions}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Color">
              <LedgerInput
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-[34px] p-1"
              />
            </LedgerField>
          </div>
          <LedgerCheckboxField
            label="Active category"
            checked={form.isActive}
            onChange={(checked) => setForm({ ...form, isActive: checked })}
          />
          <LedgerFormActions>
            <LedgerButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}
