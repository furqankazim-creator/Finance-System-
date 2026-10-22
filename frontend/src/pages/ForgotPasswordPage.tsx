import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message || 'If that email exists, a reset link has been generated.');
      setResetUrl(response.data.data?.resetUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset.');
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
            Reset password
          </h1>
          <p className="text-[13px] text-[#6c726c]">Enter your email and we&apos;ll generate a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-[8px] border border-[#efc9cc] bg-[#faecee] px-3 py-2 text-[12px] text-[#b25d67]">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-[8px] border border-[#cdd8cf] bg-[#edf5ef] px-3 py-2 text-[12px] text-[#2e5a45]">
              <p>{message}</p>
              {resetUrl && (
                <p className="mt-2 break-all">
                  Development reset link:{' '}
                  <a href={resetUrl} className="text-[#0d6847] underline">
                    {resetUrl}
                  </a>
                </p>
              )}
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

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full rounded-[8px] bg-[#0d6847] px-4 py-2.5 text-[13px] font-medium text-[#f3efe4] transition hover:bg-[#0b5b3d] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Generating link...' : 'Send reset link'}
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
