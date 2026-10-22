export interface Organization {
  _id: string;
  name: string;
  currency: string;
  fiscalYearStart: number;
  userId: string;
}

export interface Client {
  _id: string;
  orgId: string;
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

export interface Project {
  _id: string;
  orgId: string;
  clientId: string | Client;
  name: string;
  description?: string;
  budgetCents: number;
  status: "active" | "on-hold" | "completed" | "cancelled";
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  _id: string;
  orgId: string;
  name: string;
  parentCategoryId?: string;
  type: "fixed" | "variable" | "cogs" | "opex" | "revenue";
  color: string;
  isActive: boolean;
}

export interface Expense {
  _id: string;
  orgId: string;
  projectId?: string | Project;
  categoryId: string | ExpenseCategory;
  vendor: string;
  description?: string;
  amountCents: number;
  date: string;
  source: "manual" | "bank" | "ocr";
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  _id: string;
  orgId: string;
  projectId?: string | Project;
  clientId: string | Client;
  invoiceNumber: string;
  amountCents: number;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description?: string;
  notes?: string;
  createdAt: string;
}

export interface InvoicePayment {
  _id: string;
  orgId: string;
  invoiceId: string;
  amountCents: number;
  paidDate: string;
  method: "bank_transfer" | "credit_card" | "cash" | "cheque" | "other";
  reference?: string;
  notes?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface DashboardStats {
  currentMonth: {
    revenueCents: number;
    expensesCents: number;
    netProfitCents: number;
  };
  previousMonth: {
    revenueCents: number;
    expensesCents: number;
    netProfitCents: number;
  };
  topExpenseCategories: Array<{
    categoryName: string;
    color: string;
    totalCents: number;
  }>;
  outstandingInvoices: Invoice[];
}

export interface PLReport {
  period: { from: string; to: string };
  revenue: { totalCents: number; byCategory: CategoryBreakdown[] };
  cogs: { totalCents: number; byCategory: CategoryBreakdown[] };
  opex: { totalCents: number; byCategory: CategoryBreakdown[] };
  grossProfit: number;
  netProfit: number;
  monthlyComparison: MonthlyData[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  totalCents: number;
}

export interface MonthlyData {
  month: string;
  revenueCents: number;
  expensesCents: number;
  netProfitCents: number;
}
