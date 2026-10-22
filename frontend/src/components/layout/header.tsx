import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#dfd8cc] bg-[#f7f4ec] px-6">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7e837b]">Account</p>
        <p className="text-[13px] text-[#364941]">{user?.fullName || 'User'}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-[12px] text-[#6d746d]">{user?.email}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-[8px] border border-[#d7d1c6] bg-[#fbfaf6] px-3 py-1.5 text-[12px] font-medium text-[#31443c] transition hover:bg-[#f1ece2]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
