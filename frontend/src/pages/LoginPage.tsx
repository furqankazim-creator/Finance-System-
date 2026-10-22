import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-4">
      <div className="w-full max-w-md rounded-[14px] border border-[#d8d2c7] bg-[#fbfaf6] p-8 shadow-[0_1px_0_rgba(80,85,71,0.04)]">
        <div className="space-y-1 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#7f8279]">TGT Finance</p>
          <h1
            className="text-[34px] leading-none text-[#1f352c]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Sign in
          </h1>
          <p className="text-[13px] text-[#6c726c]">Open your finance workspace.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mt-6 space-y-4">
            {error && (
              <div className="rounded-[8px] border border-[#efc9cc] bg-[#faecee] px-3 py-2 text-[12px] text-[#b25d67]">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[12px] font-medium text-[#364941]">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-[8px] border border-[#d9d3c8] bg-white px-3 py-2.5 text-[13px] text-[#31443c] outline-none placeholder:text-[#9aa097] focus:border-[#0d6847]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[12px] font-medium text-[#364941]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-[8px] border border-[#d9d3c8] bg-white px-3 py-2.5 text-[13px] text-[#31443c] outline-none focus:border-[#0d6847]"
              />
              <div className="text-right">
                <Link to="/forgot-password" className="text-[12px] text-[#0d6847] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full rounded-[8px] bg-[#0d6847] px-4 py-2.5 text-[13px] font-medium text-[#f3efe4] transition hover:bg-[#0b5b3d] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-center text-[12px] text-[#6c726c]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#0d6847] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
