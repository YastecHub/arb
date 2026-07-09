'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Reset password</h1>
        <p className="mb-6 text-sm text-slate-500">Enter your email and we&apos;ll send a reset link.</p>
        {sent ? (
          <Alert kind="success">
            If an account exists for {email}, a reset link has been sent. Check your email (or the server console in dev).
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
