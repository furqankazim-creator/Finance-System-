import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useNavigate, Link } from 'react-router-dom';

export function Header() {
  const { user, signOut } = useAuth();
  const { actualTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/80 px-6 backdrop-blur-md transition-colors dark:border-slate-800/90 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {initials}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user?.fullName || 'Administrator'}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-none">{user?.email || 'admin@tgtfinance.com'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`}
          className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span>{actualTheme === 'dark' ? '🌙' : '☀️'}</span>
          <span className="hidden sm:inline capitalize">{actualTheme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        <Link
          to="/settings"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <span>⚙️</span>
          <span className="hidden sm:inline">Settings</span>
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60 dark:hover:text-rose-400"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
