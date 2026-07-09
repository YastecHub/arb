'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui';

function ResetInner() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">Choose a new password</h1>
        {done ? (
          <>
            <Alert kind="success">Password updated. You can now log in.</Alert>
            <Link href="/login" className="btn-primary mt-4 w-full">
              Go to login
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}
            {!token && <Alert>Missing reset token. Use the link from your email.</Alert>}
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={busy || !token}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetInner />
    </Suspense>
  );
}
