'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { StatusBadge, Spinner, Alert, Tag } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<Submission | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const pdfUrl = `${API_URL}/api/library/${id}/download`;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/login');
  }, [loading, user, router]);

  async function load() {
    setSub(await api<Submission>(`/api/admin/submissions/${id}`, { auth: true }));
  }
  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user, id]);

  async function act(kind: 'approve' | 'request-revision' | 'reject' | 'unpublish' | 'republish') {
    setError('');
    if (kind === 'request-revision' && !comment.trim()) {
      setError('A comment is required when requesting a revision.');
      return;
    }
    setBusy(kind);
    try {
      const body = ['request-revision', 'reject'].includes(kind) ? { comment } : undefined;
      const path =
        kind === 'unpublish' || kind === 'republish'
          ? `/api/admin/papers/${id}/${kind}`
          : `/api/admin/submissions/${id}/${kind}`;
      await api(path, { method: 'POST', body, auth: true });
      await load();
      setComment('');
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (loading || !sub) return <Spinner label="Loading submission…" />;

  const canDecide = sub.status === 'pending_review';

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-brand-600 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Document + metadata */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{sub.title}</h1>
              <StatusBadge status={sub.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {sub.author_name} · {sub.matric_number} · {sub.author_email}
            </p>
            <p className="text-xs text-slate-400">
              {sub.department} · {sub.session} · updated {formatDate(sub.updated_at)}
            </p>
            {sub.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sub.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
            <div className="mt-4">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Abstract</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{sub.abstract}</p>
            </div>
          </div>

          {sub.pdf_url ? (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                <span className="text-sm font-semibold text-slate-600">Document</span>
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                  Open in new tab
                </a>
              </div>
              <iframe src={pdfUrl} title="PDF" className="h-[70vh] w-full" />
            </div>
          ) : (
            <Alert kind="info">No PDF was attached to this submission.</Alert>
          )}
        </div>

        {/* Decision panel */}
        <aside className="space-y-4">
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold text-slate-800">Review decision</h2>
            {error && <Alert>{error}</Alert>}

            {sub.review_comment && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium">Last comment:</span> {sub.review_comment}
              </div>
            )}

            {canDecide ? (
              <>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Comments (required to request revision, optional to reject)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button className="btn-primary w-full" disabled={!!busy} onClick={() => act('approve')}>
                  {busy === 'approve' ? 'Publishing…' : 'Approve & publish'}
                </button>
                <button className="btn-outline w-full" disabled={!!busy} onClick={() => act('request-revision')}>
                  {busy === 'request-revision' ? '…' : 'Request revision'}
                </button>
                <button className="btn-danger w-full" disabled={!!busy} onClick={() => act('reject')}>
                  {busy === 'reject' ? '…' : 'Reject'}
                </button>
              </>
            ) : sub.status === 'published' ? (
              <>
                <Alert kind="success">This paper is live in the public library.</Alert>
                <p className="text-xs text-slate-500">Index status: {sub.index_status}</p>
                <button className="btn-outline w-full" disabled={!!busy} onClick={() => act('unpublish')}>
                  {busy === 'unpublish' ? '…' : 'Unpublish'}
                </button>
                <Link href={`/paper/${sub.id}`} className="btn-ghost w-full">
                  View in library
                </Link>
              </>
            ) : sub.status === 'unpublished' ? (
              <button className="btn-primary w-full" disabled={!!busy} onClick={() => act('republish')}>
                {busy === 'republish' ? '…' : 'Re-publish'}
              </button>
            ) : (
              <Alert kind="info">
                This submission is <strong>{sub.status.replace('_', ' ')}</strong>. Awaiting the student.
              </Alert>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
