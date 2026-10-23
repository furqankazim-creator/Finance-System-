import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

// Layout components
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

// Auth pages
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

// Dashboard pages
import DashboardPage from '@/pages/DashboardPage';
import ClientsPage from '@/pages/ClientsPage';
import ProjectsPage from '@/pages/ProjectsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import ExpensesPage from '@/pages/ExpensesPage';
import InvoicesPage from '@/pages/InvoicesPage';
import ReportsPage from '@/pages/ReportsPage';
import PayrollPage from '@/pages/PayrollPage';
import ChartOfAccountsPage from '@/pages/ChartOfAccountsPage';
import BookkeepingPage from '@/pages/BookkeepingPage';
import PayablesReceivablesPage from '@/pages/PayablesReceivablesPage';
import CostingPage from '@/pages/CostingPage';
import BankStatementPage from '@/pages/BankStatementPage';
import PaymentsPage from '@/pages/PaymentsPage';
import SettingsPage from '@/pages/SettingsPage';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

// Dashboard layout wrapper
function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors dark:bg-slate-950 dark:text-slate-100">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Header />
          <main className="min-h-screen px-6 py-6 lg:px-8 max-w-[1400px]">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Root redirect component
function RootRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Connecting to TGT Finance...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected dashboard routes */}
      <Route
        path="/dashboard"
        element={
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <DashboardLayout>
            <ReportsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/invoices"
        element={
          <DashboardLayout>
            <InvoicesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/expenses"
        element={
          <DashboardLayout>
            <ExpensesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/clients"
        element={
          <DashboardLayout>
            <ClientsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <DashboardLayout>
            <ProjectsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <DashboardLayout>
            <CategoriesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/payroll"
        element={
          <DashboardLayout>
            <PayrollPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/chart-of-accounts"
        element={
          <DashboardLayout>
            <ChartOfAccountsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/bookkeeping"
        element={
          <DashboardLayout>
            <BookkeepingPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/payables-receivables"
        element={
          <DashboardLayout>
            <PayablesReceivablesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/bank-statement"
        element={
          <DashboardLayout>
            <BankStatementPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/payments"
        element={
          <DashboardLayout>
            <PaymentsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/costing"
        element={
          <DashboardLayout>
            <CostingPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
