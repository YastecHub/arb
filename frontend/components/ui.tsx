'use client';
import { ReactNode } from 'react';
import type { SubmissionStatus } from '@/lib/types';
import { STATUS_META } from '@/lib/format';

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const m = STATUS_META[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-[#8a5c0d]">
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : kind === 'success'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-brand-50 text-brand-700 border-brand-100';
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
