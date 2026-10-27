import axios from 'axios';
import {
  mockOrg,
  mockDashboardStats,
  mockBreakdown,
  mockClients,
  mockProjects,
  mockCategories,
  mockInvoices,
  mockExpenses,
  mockBankAccounts,
  mockBankTransactions,
  mockTeamMembers,
} from './mockData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 6000,
});

// Attach the JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses and provide demo mode fallback
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDemo = localStorage.getItem('is_demo_mode') === 'true';
    const url = error.config?.url || '';

    // If in demo mode or network error on demo account, provide structured demo data
    if (isDemo || localStorage.getItem(TOKEN_KEY) === 'demo_live_token_verified') {
      if (url.includes('/auth/me')) {
        return Promise.resolve({ data: { success: true, data: { user: { id: '6ad9ebf3ffbde65cb435eb6a', fullName: 'Demo Executive', email: 'demo@gmail.com', role: 'admin' } } } });
      }
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({ data: { success: true, data: mockDashboardStats } });
      }
      if (url.includes('/dashboard/breakdown')) {
        return Promise.resolve({ data: { success: true, data: mockBreakdown } });
      }
      if (url.includes('/dashboard/payables-receivables')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              receivables: { totalCents: 117000000, invoices: mockInvoices.filter((i) => i.status !== 'paid') },
              payables: { loansTotalCents: 45000000, salaryDuesTotalCents: 32000000, loans: [], salaryDues: [] },
            },
          },
        });
      }
      if (url.includes('/dashboard/account-summary')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { totalBankCents: 902450000, totalReceivableCents: 117000000, totalPayableCents: 77000000 },
          },
        });
      }
      if (url.includes('/organizations/me')) {
        return Promise.resolve({ data: { success: true, data: mockOrg } });
      }
      if (url.includes('/organizations/team')) {
        return Promise.resolve({ data: { success: true, data: mockTeamMembers } });
      }
      if (url.includes('/clients')) {
        return Promise.resolve({ data: { success: true, data: mockClients, pagination: { total: mockClients.length } } });
      }
      if (url.includes('/projects')) {
        return Promise.resolve({ data: { success: true, data: mockProjects, pagination: { total: mockProjects.length } } });
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { success: true, data: mockCategories } });
      }
      if (url.includes('/invoices')) {
        return Promise.resolve({ data: { success: true, data: mockInvoices, pagination: { total: mockInvoices.length } } });
      }
      if (url.includes('/expenses')) {
        return Promise.resolve({ data: { success: true, data: mockExpenses, pagination: { total: mockExpenses.length } } });
      }
      if (url.includes('/bank-accounts')) {
        return Promise.resolve({ data: { success: true, data: mockBankAccounts } });
      }
      if (url.includes('/bank-transactions')) {
        return Promise.resolve({ data: { success: true, data: mockBankTransactions } });
      }
      if (url.includes('/statements/files')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes('/accounts')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes('/reports/executive')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              orgName: mockOrg.name,
              currency: 'PKR',
              periodType: 'weekly',
              periodLabel: 'Current Week',
              revenueCents: 485000000,
              expensesCents: 242000000,
              netProfitCents: 243000000,
              netMarginPct: 50.1,
              cashInBankCents: 902450000,
              receivables: { totalCents: 117000000, openCount: 2, overdueCount: 1 },
              revenueChangePct: 18.2,
              expensesChangePct: 5.2,
              netProfitChangePct: 35.0,
              cogsBreakdown: [{ category: 'Engineering Salaries', totalCents: 120000000 }],
              opexBreakdown: [{ category: 'Cloud Infrastructure', totalCents: 45000000 }],
            },
          },
        });
      }
      if (url.includes('/reports/profit-loss')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              revenue: { totalCents: 485000000, byCategory: [{ category: 'SaaS Retainer', totalCents: 485000000 }] },
              cogs: { totalCents: 120000000, byCategory: [{ category: 'Salaries', totalCents: 120000000 }] },
              opex: { totalCents: 122000000, byCategory: [{ category: 'Cloud & Office', totalCents: 122000000 }] },
              grossProfitCents: 365000000,
              netProfitCents: 243000000,
              netMarginPct: 50.1,
            },
          },
        });
      }

      // Default fallback for any other demo calls
      return Promise.resolve({ data: { success: true, data: {} } });
    }

    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
