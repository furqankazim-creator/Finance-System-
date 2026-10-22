export interface Client {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRef {
  _id: string;
  name: string;
  email?: string;
}

export interface Project {
  _id: string;
  clientId: ClientRef | string;
  name: string;
  description?: string;
  budgetCents: number;
  status: 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRef {
  _id: string;
  name: string;
}

export interface ExpenseCategory {
  _id: string;
  name: string;
  parentCategoryId?: string | null;
  type: 'fixed' | 'variable' | 'cogs' | 'opex' | 'revenue';
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRef {
  _id: string;
  name: string;
  color?: string;
  type?: string;
}

export interface Expense {
  _id: string;
  projectId?: ProjectRef | string | null;
  categoryId: CategoryRef | string;
  accountId?: string | null;
  vendor: string;
  description?: string;
  amountCents: number;
  date: string;
  source: 'manual' | 'bank' | 'ocr';
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePayment {
  _id: string;
  invoiceId: string;
  amountCents: number;
  paidDate: string;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'cheque' | 'other';
  reference?: string;
  notes?: string;
}

export interface Invoice {
  _id: string;
  projectId?: ProjectRef | string | null;
  clientId: ClientRef | string;
  accountId?: string | null;
  invoiceNumber: string;
  amountCents: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payments?: InvoicePayment[];
}

export interface Payroll {
  _id: string;
  accountId?: string | null;
  employeeName: string;
  employeeEmail?: string;
  role?: string;
  month: number;
  year: number;
  grossCents: number;
  deductionsCents: number;
  netCents: number;
  paidDate?: string;
  status: 'pending' | 'paid';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteImpact {
  blocked: boolean;
  message: string;
  dependencies: {
    label: string;
    count: number;
  }[];
}

export interface DashboardStats {
  currentMonth: { revenueCents: number; expensesCents: number; netProfitCents: number };
  previousMonth: { revenueCents: number; expensesCents: number; netProfitCents: number };
  topExpenseCategories: { categoryName: string; color: string; totalCents: number }[];
  outstandingInvoices: Invoice[];
}

export interface IncomeExpenseBreakdown {
  monthly: { month: string; incomeCents: number; expenseCents: number }[];
  topIncome: { name: string; totalCents: number }[];
  topExpense: { name: string; totalCents: number }[];
}

export interface PLCategoryBreakdown {
  categoryId?: string;
  categoryName: string;
  color: string;
  totalCents: number;
}

export interface PLReport {
  period: { from: string; to: string };
  revenue: { totalCents: number; byCategory: PLCategoryBreakdown[] };
  cogs: { totalCents: number; byCategory: PLCategoryBreakdown[] };
  opex: { totalCents: number; byCategory: PLCategoryBreakdown[] };
  grossProfit: number;
  netProfit: number;
  monthlyComparison: { month: string; revenueCents: number; expensesCents: number; netProfitCents: number }[];
}

// ── Accounts Module: Chart of Accounts, Bookkeeping, Payables/Receivables, Costing ──

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  _id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  parentAccountId?: string | null;
  normalBalance: 'debit' | 'credit';
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRef {
  _id: string;
  accountNumber: string;
  name: string;
  type?: AccountType;
}

export interface Transaction {
  _id: string;
  accountId: AccountRef | string;
  parentTransactionId?: string | null;
  type: AccountType;
  transactionRef: string;
  amountCents: number;
  paidCents: number;
  date: string;
  description?: string;
  investorName?: string;
  debtor?: string;
  assetType?: string;
  pictureUrl?: string;
  location?: string;
  status: 'open' | 'settled';
  createdAt: string;
  updatedAt: string;
}

export interface PayablesReceivables {
  receivables: {
    totalCents: number;
    invoices: Invoice[];
  };
  payables: {
    totalCents: number;
    loans: Transaction[];
    loansTotalCents: number;
    salaryDues: Payroll[];
    salaryDuesTotalCents: number;
  };
}

export interface CostSettings {
  _id: string;
  monthlyOverheadCents: number;
  monthlyCapacityHours: number;
  defaultProfitMarginPct: number;
}

export interface CostRate {
  settings: CostSettings;
  monthlyPayrollCostCents: number;
  recordedOverheadCents: number;
  totalMonthlyCostCents: number;
  perHourCostCents: number;
  costByProject: { projectName: string; totalCents: number }[];
}

export interface AccountSummary {
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
  bookkeepingRevenueCents: number;
  bookkeepingExpensesCents: number;
  monthlyBookkeepingExpensesCents: number;
}

export interface ProjectEstimate {
  _id: string;
  projectId?: ProjectRef | string | null;
  clientId?: ClientRef | string | null;
  title: string;
  estimatedManHours: number;
  hourlyCostCentsUsed: number;
  baseCostCents: number;
  profitMarginPct: number;
  finalBidCostCents: number;
  notes?: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  _id: string;
  bankName: string;
  accountNumberMasked: string;
  accountType: 'checking' | 'savings' | 'credit';
  currency: string;
  isActive: boolean;
  inflowCents: number;
  outflowCents: number;
  balanceCents: number;
  transactionCount: number;
}

export interface BankTransaction {
  _id: string;
  bankAccountId: { _id: string; bankName: string; accountNumberMasked: string } | string;
  date: string;
  description: string;
  amountCents: number;
  direction: 'inflow' | 'outflow';
  status: 'unmatched' | 'matched' | 'ignored';
  notes?: string;
}

export interface PaymentRecord {
  _id: string;
  invoiceId: {
    _id: string;
    invoiceNumber: string;
    amountCents: number;
    status: string;
    clientId?: { _id: string; name: string } | null;
  } | null;
  amountCents: number;
  paidDate: string;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'cheque' | 'other';
  reference?: string;
  notes?: string;
}

export interface StatementFile {
  _id: string;
  bankAccountId?: { _id: string; bankName: string; accountNumberMasked: string } | string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes?: string;
  createdAt: string;
}
