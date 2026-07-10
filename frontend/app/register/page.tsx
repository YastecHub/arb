'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert } from '@/components/ui';
import { ENGINEERING_DEPARTMENTS } from '@/lib/departments';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', matricNumber: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/auth/register', { method: 'POST', body: form });
      setDone(true);
    } catch (err: any) {
      setError(err.details?.[0]?.message || err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card space-y-4 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
          <h1 className="text-xl font-bold text-slate-800">Account created</h1>
          <p className="text-sm text-slate-600">Your account is active. You can now log in.</p>
          <Link href="/login" className="btn-primary w-full">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Register</h1>
        <p className="mb-6 text-sm text-slate-500">
          Students register with a <span className="font-medium">@unilag.edu.ng</span> email.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} maxLength={100} autoComplete="name" />
          </div>
          <div>
            <label className="label">UNILAG email</label>
            <input
              className="input"
              type="email"
              placeholder="you@unilag.edu.ng"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Department</label>
              <select className="input bg-white" value={form.department} onChange={(e) => set('department', e.target.value)} required>
                <option value="" disabled>Select department</option>
                {ENGINEERING_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Matric number</label>
              <input
                className="input"
                value={form.matricNumber}
                onChange={(e) => set('matricNumber', e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9./-]*"
                title="Use letters, numbers, dots, slashes, or hyphens"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
