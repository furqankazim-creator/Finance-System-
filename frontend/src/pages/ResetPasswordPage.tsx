import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';

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
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] px-4">
      <div className="w-full max-w-md rounded-[14px] border border-[#d8d2c7] bg-[#fbfaf6] p-8 shadow-[0_1px_0_rgba(80,85,71,0.04)]">
        <div className="space-y-1 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#7f8279]">TGT Finance</p>
          <h1
            className="text-[34px] leading-none text-[#1f352c]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Choose a new password
          </h1>
          <p className="text-[13px] text-[#6c726c]">Use at least 8 characters.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-[8px] border border-[#efc9cc] bg-[#faecee] px-3 py-2 text-[12px] text-[#b25d67]">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-[8px] border border-[#cdd8cf] bg-[#edf5ef] px-3 py-2 text-[12px] text-[#2e5a45]">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-[12px] font-medium text-[#364941]">
              New password
            </label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-[8px] border border-[#d9d3c8] bg-white px-3 py-2.5 text-[13px] text-[#31443c] outline-none focus:border-[#0d6847]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-[12px] font-medium text-[#364941]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-[8px] border border-[#d9d3c8] bg-white px-3 py-2.5 text-[13px] text-[#31443c] outline-none focus:border-[#0d6847]"
            />
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full rounded-[8px] bg-[#0d6847] px-4 py-2.5 text-[13px] font-medium text-[#f3efe4] transition hover:bg-[#0b5b3d] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
            <p className="text-center text-[12px] text-[#6c726c]">
              Back to{' '}
              <Link to="/login" className="text-[#0d6847] hover:underline">
                sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
