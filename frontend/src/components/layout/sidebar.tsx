import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/reports', label: 'P&L Report' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/clients', label: 'Clients' },
  { href: '/projects', label: 'Projects' },
  { href: '/categories', label: 'Categories' },
  { href: '/payroll', label: 'Payroll' },
  { href: '/chart-of-accounts', label: 'Chart of Accounts' },
  { href: '/bookkeeping', label: 'Bookkeeping' },
  { href: '/payables-receivables', label: 'Payables & Receivables' },
  { href: '/bank-statement', label: 'Bank Statement' },
  { href: '/payments', label: 'Payments' },
  { href: '/costing', label: 'Costing' },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="sticky top-0 flex h-screen w-[228px] shrink-0 flex-col justify-between border-r border-[#ddd7ca] bg-[#f8f5ed]">
      <div className="px-4 py-5">
        <div className="border-b border-[#e4ddd1] pb-4">
          <p
            className="text-[19px] leading-none text-[#1b5a46]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            TGT Finance
          </p>
          <p className="mt-2 text-[10px] italic leading-snug text-[#6f746d]">
            Books that keep themselves.
          </p>
        </div>

        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'block rounded-[8px] px-3.5 py-2.5 text-[12.5px] font-medium leading-none transition-all duration-150',
                  isActive
                    ? 'bg-[#0b6b48] text-[#f4f1e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_1px_rgba(31,46,39,0.08)]'
                    : 'text-[#3e473f] hover:bg-[#ece6da] hover:text-[#24362e]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#e4ddd1] px-4 py-3 text-[9px] leading-snug text-[#7d837a]">
        Synced with your organization
      </div>
    </aside>
  );
}
