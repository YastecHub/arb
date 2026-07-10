'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { StatusBadge, Spinner, Alert, EmptyState, Tag } from '@/components/ui';
import { formatDate } from '@/lib/format';

const ACTIVE = ['draft', 'pending_review', 'revision_requested'];

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'admin') router.replace('/admin');
  }, [loading, user, router]);

  async function load() {
    try {
      setSubs(await api<Submission[]>('/api/submissions/mine', { auth: true }));
    } catch (err: any) {
      setError(err.message || 'Could not load your submissions');
      setSubs([]);
    }
  }
  useEffect(() => {
    if (user?.role === 'student') load();
  }, [user]);

  async function submitForReview(id: string) {
    setBusyId(id);
    setError('');
    try {
      await api(`/api/submissions/${id}/submit`, { method: 'POST', auth: true });
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not submit for review');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !subs) return <Spinner label="Loading your submissions…" />;

  const hasActive = subs.some((s) => ACTIVE.includes(s.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Submissions</h1>
          <p className="text-sm text-slate-500">Upload and track your research project.</p>
        </div>
        <Link
          href="/submit"
          className={`btn-primary ${hasActive ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={hasActive}
        >
          + New submission
        </Link>
      </div>

      {hasActive && (
        <Alert kind="info">You have an active submission. Finish or await a decision on it before starting a new one.</Alert>
      )}

      {error && <Alert>{error}</Alert>}

      {subs.length === 0 ? (
        <EmptyState title="No submissions yet." hint="Click “New submission” to upload your project." />
      ) : (
        <div className="space-y-4">
          {subs.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-800">{s.title}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.session ? `${s.session} · ` : ''}Updated {formatDate(s.updated_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.abstract}</p>
                  {s.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.tags.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  )}
                  {s.review_comment && (s.status === 'revision_requested' || s.status === 'rejected') && (
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                      <span className="font-medium">Admin comment:</span> {s.review_comment}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {(s.status === 'draft' || s.status === 'revision_requested') && (
                    <>
                      <Link href={`/submit?id=${s.id}`} className="btn-outline">
                        Edit
                      </Link>
                      <button className="btn-primary" disabled={busyId === s.id} onClick={() => submitForReview(s.id)}>
                        {busyId === s.id ? '…' : s.status === 'draft' ? 'Submit' : 'Resubmit'}
                      </button>
                    </>
                  )}
                  {s.status === 'published' && (
                    <Link href={`/paper/${s.id}`} className="btn-outline">
                      View in library
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
