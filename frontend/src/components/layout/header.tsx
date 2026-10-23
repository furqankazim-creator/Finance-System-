import { useAuth } from '@/lib/auth-context';
import { useNavigate, Link } from 'react-router-dom';

export function Header() {
  const { user, signOut } = useAuth();
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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-xs text-slate-700">
          {initials}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 leading-none">{user?.fullName || 'Administrator'}</p>
          <p className="mt-1 text-[11px] text-slate-500 leading-none">{user?.email || 'admin@tgtfinance.com'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span>⚙️</span>
          <span>Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
