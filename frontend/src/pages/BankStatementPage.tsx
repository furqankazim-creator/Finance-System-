import { useEffect, useMemo, useState } from 'react';
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
  LedgerRowAction,
  LedgerSelect,
  LedgerStatCard,
  LedgerTable,
  LedgerTextarea,
} from '@/components/app/ledger-ui';
import api from '@/lib/api';
import { formatCents } from '@/lib/money';
import type { BankAccount, BankTransaction, ExpenseCategory, Invoice, StatementFile } from '@/lib/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

const accountTypeOptions = [
  { value: 'checking', label: 'Current / Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
];
const directionOptions = [
  { value: 'inflow', label: 'Money in (credit)' },
  { value: 'outflow', label: 'Money out (debit)' },
];
const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  { value: 'unmatched', label: 'Unmatched' },
  { value: 'matched', label: 'Matched' },
  { value: 'ignored', label: 'Ignored' },
];

// Minimal CSV line splitter that understands quoted fields
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const toNumber = (s: string) => parseFloat((s || '').replace(/[^0-9.\-]/g, ''));

interface ParsedLine {
  date: string;
  description: string;
  amount: number;
  direction: 'inflow' | 'outflow';
}

// Accepts headers: date, description, amount (negative = out) OR debit/credit columns
function parseStatementCsv(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const dateI = idx(['date']);
  const descI = idx(['description', 'narration', 'details', 'particular', 'memo']);
  const amountI = idx(['amount']);
  const debitI = idx(['debit', 'withdraw']);
  const creditI = idx(['credit', 'deposit']);
  if (dateI < 0 || descI < 0 || (amountI < 0 && debitI < 0 && creditI < 0)) return [];

  const result: ParsedLine[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const date = new Date(cols[dateI]);
    if (isNaN(date.getTime())) continue;
    let amount = 0;
    let direction: 'inflow' | 'outflow' = 'inflow';
    if (amountI >= 0 && !isNaN(toNumber(cols[amountI]))) {
      const n = toNumber(cols[amountI]);
      amount = Math.abs(n);
      direction = n < 0 ? 'outflow' : 'inflow';
    } else {
      const debit = toNumber(cols[debitI]);
      const credit = toNumber(cols[creditI]);
      if (!isNaN(debit) && debit > 0) {
        amount = debit;
        direction = 'outflow';
      } else if (!isNaN(credit) && credit > 0) {
        amount = credit;
        direction = 'inflow';
      }
    }
    if (!amount) continue;
    result.push({ date: date.toISOString().slice(0, 10), description: cols[descI] || 'Bank entry', amount, direction });
  }
  return result;
}

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const FILE_ACCEPT = '.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp';

const SAMPLE_CSV = `date,description,amount
${todayISO()},Client payment - Acme Corp,150000
${todayISO()},Office rent,-120000
${todayISO()},AWS monthly bill,-45000`;

export default function BankStatementPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [accountFilter, setAccountFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [accountModal, setAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    bankName: '',
    accountNumberMasked: '',
    accountType: 'checking',
    currency: 'PKR',
  });

  const [entryModal, setEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    bankAccountId: '',
    date: todayISO(),
    description: '',
    amount: '',
    direction: 'inflow',
    notes: '',
  });

  const [importModal, setImportModal] = useState(false);
  const [importAccountId, setImportAccountId] = useState('');
  const [importText, setImportText] = useState('');

  const [serverRows, setServerRows] = useState<ParsedLine[] | null>(null);
  const [importFile, setImportFile] = useState<{ name: string; base64: string } | null>(null);
  const [keepCopy, setKeepCopy] = useState(true);
  const [fileMessage, setFileMessage] = useState('');
  const [parsingFile, setParsingFile] = useState(false);
  const [files, setFiles] = useState<StatementFile[]>([]);

  const [matchTx, setMatchTx] = useState<BankTransaction | null>(null);
  const [matchInvoiceId, setMatchInvoiceId] = useState('');
  const [matchCategoryId, setMatchCategoryId] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accRes, catRes, invRes] = await Promise.all([
        api.get('/bank-accounts'),
        api.get('/categories'),
        api.get('/invoices?limit=100'),
      ]);
      setAccounts(accRes.data.data);
      setCategories(catRes.data.data);
      setInvoices(invRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bank data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (accountFilter) params.set('bankAccountId', accountFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/bank-transactions?${params.toString()}`);
      setTransactions(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement');
    }
  };

  const loadFiles = async () => {
    try {
      const res = await api.get('/statements/files');
      setFiles(res.data.data);
    } catch {
      /* non-critical */
    }
  };

  const refresh = async () => {
    loadFiles();
    await Promise.all([loadAll(), loadTransactions()]);
  };

  useEffect(() => {
    loadAll();
    loadFiles();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [accountFilter, statusFilter]);

  const totals = useMemo(() => {
    const scope = accountFilter ? accounts.filter((a) => a._id === accountFilter) : accounts;
    return {
      balance: scope.reduce((s, a) => s + a.balanceCents, 0),
      inflow: scope.reduce((s, a) => s + a.inflowCents, 0),
      outflow: scope.reduce((s, a) => s + a.outflowCents, 0),
    };
  }, [accounts, accountFilter]);

  const unmatchedCount = transactions.filter((t) => t.status === 'unmatched').length;
  const accountOptions = accounts.map((a) => ({
    value: a._id,
    label: `${a.bankName} · ${a.accountNumberMasked}`,
  }));
  const txAccountName = (tx: BankTransaction) =>
    typeof tx.bankAccountId === 'string' ? '' : tx.bankAccountId?.bankName ?? '';

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setSaving(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setSaving(false);
    }
  };

  const submitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post('/bank-accounts', accountForm);
      setAccountModal(false);
      setAccountForm({ bankName: '', accountNumberMasked: '', accountType: 'checking', currency: 'PKR' });
      await refresh();
    }, 'Failed to add bank account');
  };

  const openEntry = () => {
    setEntryForm({
      bankAccountId: accountFilter || accounts[0]?._id || '',
      date: todayISO(),
      description: '',
      amount: '',
      direction: 'inflow',
      notes: '',
    });
    setError('');
    setEntryModal(true);
  };

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.post('/bank-transactions', {
        ...entryForm,
        amount: parseFloat(entryForm.amount),
        notes: entryForm.notes || undefined,
      });
      setEntryModal(false);
      await refresh();
    }, 'Failed to add statement entry');
  };

  const openImport = () => {
    setImportAccountId(accountFilter || accounts[0]?._id || '');
    setImportText('');
    setServerRows(null);
    setImportFile(null);
    setFileMessage('');
    setError('');
    setImportModal(true);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setFileMessage('');
    setServerRows(null);
    setImportFile(null);
    setImportText('');
    if (file.size > 7 * 1024 * 1024) {
      setError('File is larger than 7 MB');
      return;
    }
    setParsingFile(true);
    try {
      const base64 = await readAsBase64(file);
      setImportFile({ name: file.name, base64 });
      const res = await api.post('/statements/parse', { fileName: file.name, dataBase64: base64 });
      setServerRows(res.data.data.rows);
      setFileMessage(res.data.data.message ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file');
    } finally {
      setParsingFile(false);
    }
  };

  const textParsed = useMemo(() => parseStatementCsv(importText), [importText]);
  const parsed = serverRows ?? textParsed;

  const submitImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.length === 0) {
      setError('No valid rows found. Use columns: date, description, amount (or debit/credit).');
      return;
    }
    run(async () => {
      await api.post('/bank-transactions/import', { bankAccountId: importAccountId, transactions: parsed });
      if (keepCopy && importFile) {
        await api.post('/statements/files', {
          bankAccountId: importAccountId,
          fileName: importFile.name,
          dataBase64: importFile.base64,
        });
      }
      setImportModal(false);
      await refresh();
    }, 'Failed to import statement');
  };

  const saveFileOnly = () =>
    run(async () => {
      if (!importFile) return;
      await api.post('/statements/files', {
        bankAccountId: importAccountId,
        fileName: importFile.name,
        dataBase64: importFile.base64,
      });
      setImportModal(false);
      await refresh();
    }, 'Failed to save file');

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > 7 * 1024 * 1024) {
      setError('File is larger than 7 MB');
      return;
    }
    run(async () => {
      await api.post('/statements/files', {
        bankAccountId: accountFilter || undefined,
        fileName: file.name,
        dataBase64: await readAsBase64(file),
      });
      await loadFiles();
    }, 'Failed to upload file');
  };

  const openFile = async (f: StatementFile) => {
    try {
      const res = await api.get(`/statements/files/${f._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    }
  };

  const deleteFile = (f: StatementFile) => {
    if (!window.confirm(`Delete ${f.originalName}?`)) return;
    run(async () => {
      await api.delete(`/statements/files/${f._id}`);
      await loadFiles();
    }, 'Failed to delete file');
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.set('bankAccountId', accountFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/bank-transactions/export?${params.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bank-statement.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const setStatus = (tx: BankTransaction, status: 'unmatched' | 'ignored') =>
    run(async () => {
      await api.put(`/bank-transactions/${tx._id}`, { status });
      await refresh();
    }, 'Failed to update entry');

  const handleDelete = (tx: BankTransaction) => {
    if (!window.confirm('Delete this statement entry?')) return;
    run(async () => {
      await api.delete(`/bank-transactions/${tx._id}`);
      await refresh();
    }, 'Failed to delete entry');
  };

  const openMatch = (tx: BankTransaction) => {
    setMatchTx(tx);
    setMatchInvoiceId('');
    setMatchCategoryId(categories.find((c) => c.type !== 'revenue')?._id ?? '');
    setError('');
  };

  const openInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');

  const submitMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchTx) return;
    run(async () => {
      if (matchTx.direction === 'inflow') {
        await api.post(`/bank-transactions/${matchTx._id}/match-invoice`, { invoiceId: matchInvoiceId });
      } else {
        await api.post(`/bank-transactions/${matchTx._id}/match-expense`, { categoryId: matchCategoryId });
      }
      setMatchTx(null);
      await refresh();
    }, 'Failed to match entry');
  };

  return (
    <LedgerPage>
      <LedgerHeader
        title="Bank Statement"
        description="Your bank accounts and statement lines. Import a CSV, then match entries to invoices and expenses."
        action={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {accounts.length > 0 && (
              <LedgerButton onClick={openEntry}>+ Add entry</LedgerButton>
            )}
            <LedgerButton variant="secondary" onClick={openImport}>
              Import file
            </LedgerButton>
            <LedgerButton variant="secondary" onClick={exportExcel}>
              Export Excel
            </LedgerButton>
            <LedgerButton variant="secondary" onClick={() => setAccountModal(true)}>
              + Bank account
            </LedgerButton>
          </div>
        }
      />

      {error && !entryModal && !importModal && !accountModal && !matchTx && (
        <LedgerFormError>{error}</LedgerFormError>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <LedgerStatCard label="Balance" value={formatCents(totals.balance)} note="Money in minus money out" />
        <LedgerStatCard label="Money in" value={formatCents(totals.inflow)} note="Deposits & receipts" noteTone="positive" />
        <LedgerStatCard label="Money out" value={formatCents(totals.outflow)} note="Withdrawals & payments" noteTone="negative" />
        <LedgerStatCard
          label="To reconcile"
          value={String(unmatchedCount)}
          note={unmatchedCount ? 'Entries need matching' : 'All caught up'}
          noteTone={unmatchedCount ? 'negative' : 'positive'}
        />
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {accounts.map((a) => (
            <LedgerCard
              key={a._id}
              className={`cursor-pointer p-4 ${accountFilter === a._id ? 'ring-1 ring-[#0d6847]' : ''}`}
              onClick={() => setAccountFilter(accountFilter === a._id ? '' : a._id)}
            >
              <p className="text-[13px] font-medium text-[#1f352c]">{a.bankName}</p>
              <p className="mt-0.5 text-[11px] text-[#7b8078]">
                {a.accountNumberMasked} · {a.accountType}
              </p>
              <p className="mt-3 text-[18px] text-[#293d34]" style={{ fontFamily: "Georgia, serif" }}>
                {formatCents(a.balanceCents, a.currency)}
              </p>
              <p className="mt-1 text-[10px] text-[#909388]">{a.transactionCount} entries</p>
            </LedgerCard>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <LedgerSelect
          value={accountFilter}
          onChange={setAccountFilter}
          options={[{ value: '', label: 'All accounts' }, ...accountOptions]}
        />
        <LedgerSelect value={statusFilter} onChange={setStatusFilter} options={statusFilterOptions} />
      </div>

      <LedgerTable headers={['Date', 'Description', 'Account', 'Money in', 'Money out', 'Status', '']}>
        {loading ? (
          <LedgerEmptyRow colSpan={7}>Loading statement…</LedgerEmptyRow>
        ) : accounts.length === 0 ? (
          <LedgerEmptyRow colSpan={7}>Add a bank account to start recording your statement.</LedgerEmptyRow>
        ) : transactions.length === 0 ? (
          <LedgerEmptyRow colSpan={7}>No statement entries yet. Add one or import a CSV.</LedgerEmptyRow>
        ) : (
          transactions.map((tx) => (
            <LedgerRow key={tx._id}>
              <LedgerCell muted>{new Date(tx.date).toLocaleDateString()}</LedgerCell>
              <LedgerCell strong>{tx.description}</LedgerCell>
              <LedgerCell muted>{txAccountName(tx) || '—'}</LedgerCell>
              <LedgerCell className="text-[#2c9a74]">
                {tx.direction === 'inflow' ? formatCents(tx.amountCents) : ''}
              </LedgerCell>
              <LedgerCell className="text-[#c26b6b]">
                {tx.direction === 'outflow' ? formatCents(tx.amountCents) : ''}
              </LedgerCell>
              <LedgerCell>
                <LedgerBadge tone={tx.status === 'matched' ? 'green' : tx.status === 'ignored' ? 'neutral' : 'yellow'}>
                  {tx.status}
                </LedgerBadge>
              </LedgerCell>
              <LedgerCell className="text-right">
                <div className="flex justify-end gap-3">
                  {tx.status === 'unmatched' && (
                    <LedgerRowAction onClick={() => openMatch(tx)}>
                      {tx.direction === 'inflow' ? 'Match invoice' : 'Make expense'}
                    </LedgerRowAction>
                  )}
                  {tx.status === 'unmatched' && (
                    <LedgerRowAction onClick={() => setStatus(tx, 'ignored')}>Ignore</LedgerRowAction>
                  )}
                  {tx.status === 'ignored' && (
                    <LedgerRowAction onClick={() => setStatus(tx, 'unmatched')}>Restore</LedgerRowAction>
                  )}
                  <LedgerRowAction tone="danger" onClick={() => handleDelete(tx)}>
                    Delete
                  </LedgerRowAction>
                </div>
              </LedgerCell>
            </LedgerRow>
          ))
        )}
      </LedgerTable>

      {/* Add bank account */}
      <LedgerModal open={accountModal} onClose={() => setAccountModal(false)} title="Add bank account">
        <form onSubmit={submitAccount} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <LedgerField label="Bank name">
            <LedgerInput
              required
              placeholder="e.g. HBL, Meezan Bank"
              value={accountForm.bankName}
              onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Account number (masked)">
            <LedgerInput
              required
              placeholder="****1234"
              value={accountForm.accountNumberMasked}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumberMasked: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Type">
              <LedgerFormSelect
                options={accountTypeOptions}
                value={accountForm.accountType}
                onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Currency">
              <LedgerInput
                required
                maxLength={3}
                value={accountForm.currency}
                onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value.toUpperCase() })}
              />
            </LedgerField>
          </div>
          <LedgerFormActions>
            <LedgerButton variant="secondary" onClick={() => setAccountModal(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add account'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>

      {/* Add entry */}
      <LedgerModal open={entryModal} onClose={() => setEntryModal(false)} title="Add statement entry">
        <form onSubmit={submitEntry} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <LedgerField label="Bank account">
            <LedgerFormSelect
              options={accountOptions}
              value={entryForm.bankAccountId}
              onChange={(e) => setEntryForm({ ...entryForm, bankAccountId: e.target.value })}
            />
          </LedgerField>
          <div className="grid grid-cols-2 gap-3">
            <LedgerField label="Date">
              <LedgerInput
                type="date"
                required
                value={entryForm.date}
                onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
              />
            </LedgerField>
            <LedgerField label="Direction">
              <LedgerFormSelect
                options={directionOptions}
                value={entryForm.direction}
                onChange={(e) => setEntryForm({ ...entryForm, direction: e.target.value })}
              />
            </LedgerField>
          </div>
          <LedgerField label="Description">
            <LedgerInput
              required
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Amount (PKR)">
            <LedgerInput
              type="number"
              min="0.01"
              step="0.01"
              required
              value={entryForm.amount}
              onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
            />
          </LedgerField>
          <LedgerField label="Notes">
            <LedgerTextarea
              value={entryForm.notes}
              onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
            />
          </LedgerField>
          <LedgerFormActions>
            <LedgerButton variant="secondary" onClick={() => setEntryModal(false)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add entry'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>

      {/* Import CSV */}
      <LedgerModal
        open={importModal}
        onClose={() => setImportModal(false)}
        title="Import bank statement"
        description="Upload an Excel (.xlsx/.xls), CSV or text-based PDF statement. Images can be saved as attachments."
      >
        <form onSubmit={submitImport} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          <LedgerField label="Bank account">
            <LedgerFormSelect
              options={accountOptions}
              value={importAccountId}
              onChange={(e) => setImportAccountId(e.target.value)}
            />
          </LedgerField>
          <LedgerField label="Statement file (Excel, CSV, PDF, image)">
            <input
              type="file"
              accept={FILE_ACCEPT}
              className="text-[12px] text-[#49544d]"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </LedgerField>
          {parsingFile && <p className="text-[12px] text-[#6c726c]">Reading file…</p>}
          {fileMessage && <p className="text-[12px] text-[#b07a2a]">{fileMessage}</p>}
          {!importFile && (
            <LedgerField label="…or paste CSV">
              <LedgerTextarea
                rows={5}
                placeholder={SAMPLE_CSV}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </LedgerField>
          )}
          {(importText || importFile) && !parsingFile && (
            <p className="text-[12px] text-[#6c726c]">
              {parsed.length} valid row{parsed.length === 1 ? '' : 's'} detected
              {parsed.length > 0 &&
                ` · ${formatCents(
                  parsed.reduce((s, r) => s + (r.direction === 'inflow' ? r.amount : -r.amount), 0) * 100
                )} net`}
              .
            </p>
          )}
          {parsed.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-[8px] border border-[#e4ddd1] text-[11px]">
              {parsed.slice(0, 8).map((r, i) => (
                <div key={i} className="flex justify-between gap-3 border-b border-[#eee9de] px-3 py-1.5 last:border-0">
                  <span className="text-[#7b8078]">{r.date}</span>
                  <span className="flex-1 truncate text-[#31443c]">{r.description}</span>
                  <span className={r.direction === 'inflow' ? 'text-[#2c9a74]' : 'text-[#c26b6b]'}>
                    {r.direction === 'inflow' ? '+' : '-'}
                    {r.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {parsed.length > 8 && (
                <p className="px-3 py-1.5 text-[#909388]">…and {parsed.length - 8} more</p>
              )}
            </div>
          )}
          {importFile && (
            <label className="flex items-center gap-2 text-[12px] text-[#49544d]">
              <input type="checkbox" checked={keepCopy} onChange={(e) => setKeepCopy(e.target.checked)} />
              Keep a copy of {importFile.name} in Saved statement files
            </label>
          )}
          <LedgerFormActions>
            <LedgerButton variant="secondary" onClick={() => setImportModal(false)}>
              Cancel
            </LedgerButton>
            {importFile && parsed.length === 0 && !parsingFile && (
              <LedgerButton variant="secondary" onClick={saveFileOnly} disabled={saving}>
                Save file only
              </LedgerButton>
            )}
            <LedgerButton type="submit" disabled={saving || parsingFile || parsed.length === 0}>
              {saving ? 'Importing…' : `Import ${parsed.length || ''} rows`}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>

      {/* Saved files */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-[#1f352c]">Saved statement files</p>
          <label className="cursor-pointer rounded-[7px] border border-[#d7d1c6] bg-[#fbfaf6] px-3 py-1.5 text-[12px] text-[#31443c] hover:bg-[#f1ece2]">
            Upload file / image
            <input
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                uploadAttachment(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <LedgerTable headers={['File', 'Account', 'Size', 'Uploaded', '']}>
          {files.length === 0 ? (
            <LedgerEmptyRow colSpan={5}>No files saved yet. Upload an Excel sheet, PDF or statement image.</LedgerEmptyRow>
          ) : (
            files.map((f) => (
              <LedgerRow key={f._id}>
                <LedgerCell strong>{f.originalName}</LedgerCell>
                <LedgerCell muted>
                  {typeof f.bankAccountId === 'object' && f.bankAccountId ? f.bankAccountId.bankName : '—'}
                </LedgerCell>
                <LedgerCell muted>{formatSize(f.sizeBytes)}</LedgerCell>
                <LedgerCell muted>{new Date(f.createdAt).toLocaleDateString()}</LedgerCell>
                <LedgerCell className="text-right">
                  <div className="flex justify-end gap-3">
                    <LedgerRowAction onClick={() => openFile(f)}>View</LedgerRowAction>
                    <LedgerRowAction tone="danger" onClick={() => deleteFile(f)}>
                      Delete
                    </LedgerRowAction>
                  </div>
                </LedgerCell>
              </LedgerRow>
            ))
          )}
        </LedgerTable>
      </div>

      {/* Match */}
      <LedgerModal
        open={!!matchTx}
        onClose={() => setMatchTx(null)}
        title={matchTx?.direction === 'inflow' ? 'Match to invoice' : 'Create expense'}
        description={matchTx ? `${matchTx.description} · ${formatCents(matchTx.amountCents)}` : undefined}
      >
        <form onSubmit={submitMatch} className="space-y-4">
          {error && <LedgerFormError>{error}</LedgerFormError>}
          {matchTx?.direction === 'inflow' ? (
            <LedgerField label="Unpaid invoice">
              <LedgerFormSelect
                required
                options={[
                  { value: '', label: openInvoices.length ? 'Select an invoice…' : 'No unpaid invoices' },
                  ...openInvoices.map((i) => ({
                    value: i._id,
                    label: `${i.invoiceNumber} · ${formatCents(i.amountCents)} · ${
                      typeof i.clientId === 'string' ? '' : i.clientId?.name ?? ''
                    }`,
                  })),
                ]}
                value={matchInvoiceId}
                onChange={(e) => setMatchInvoiceId(e.target.value)}
              />
            </LedgerField>
          ) : (
            <LedgerField label="Expense category">
              <LedgerFormSelect
                required
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
                value={matchCategoryId}
                onChange={(e) => setMatchCategoryId(e.target.value)}
              />
            </LedgerField>
          )}
          <LedgerFormActions>
            <LedgerButton variant="secondary" onClick={() => setMatchTx(null)}>
              Cancel
            </LedgerButton>
            <LedgerButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Confirm'}
            </LedgerButton>
          </LedgerFormActions>
        </form>
      </LedgerModal>
    </LedgerPage>
  );
}

