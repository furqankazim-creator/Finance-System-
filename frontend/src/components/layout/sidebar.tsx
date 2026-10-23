import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/reports', label: 'P&L & Briefings', icon: '📈' },
  { href: '/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/expenses', label: 'Expenses', icon: '💸' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/payroll', label: 'Payroll', icon: '💼' },
  { href: '/chart-of-accounts', label: 'Chart of Accounts', icon: '📑' },
  { href: '/bookkeeping', label: 'Bookkeeping', icon: '⚖️' },
  { href: '/payables-receivables', label: 'Payables & Receivables', icon: '🔄' },
  { href: '/bank-statement', label: 'Bank Statement', icon: '🏦' },
  { href: '/payments', label: 'Payments', icon: '💳' },
  { href: '/costing', label: 'Costing', icon: '📐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col justify-between border-r border-slate-200/90 bg-white">
      <div className="flex flex-col h-full overflow-y-auto px-4 py-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold text-sm">
            TGT
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">
              TGT Finance
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Enterprise Ledger
            </p>
          </div>
        </div>

        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] font-semibold text-slate-600">Connected & Synced</p>
        </div>
      </div>
    </aside>
  );
}
