'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    api(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(() => setState('ok'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8 text-center">
        {state === 'loading' && <Spinner label="Verifying your email…" />}
        {state === 'ok' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
            <h1 className="mb-2 text-xl font-bold text-slate-800">Email verified</h1>
            <p className="mb-4 text-sm text-slate-600">Your account is now active.</p>
            <Link href="/login" className="btn-primary w-full">
              Log in
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">!</div>
            <h1 className="mb-2 text-xl font-bold text-slate-800">Verification failed</h1>
            <p className="text-sm text-slate-600">This link is invalid or has already been used.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyInner />
    </Suspense>
  );
}
