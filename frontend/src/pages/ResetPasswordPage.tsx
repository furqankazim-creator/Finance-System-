import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { TgtLogo } from '@/components/app/TgtLogo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset link is missing a token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(response.data.message || 'Password reset successful.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 transition-colors dark:bg-slate-950 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:ring-white/[0.04]">
        <div className="flex flex-col items-center text-center">
          <TgtLogo size="lg" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Choose a new password
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Must be at least 8 characters long</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300/85 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col space-y-4 pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold tracking-wide text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              disabled={loading}
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Back to{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
