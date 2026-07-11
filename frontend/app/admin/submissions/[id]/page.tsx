'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiBlobUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission, SubmissionThreadEvent } from '@/lib/types';
import { StatusBadge, Spinner, Alert, Tag } from '@/components/ui';
import { formatDate } from '@/lib/format';
import AppShell from '@/components/AppShell';
import { AdminDecisionComposer, ReviewThread } from '@/components/ReviewThread';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<Submission | null>(null);
  const [events, setEvents] = useState<SubmissionThreadEvent[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/login');
  }, [loading, user, router]);

  async function load() {
    try {
      const [nextSub, nextEvents] = await Promise.all([
        api<Submission>(`/api/admin/submissions/${id}`, { auth: true }),
        api<SubmissionThreadEvent[]>(`/api/admin/submissions/${id}/thread`, { auth: true }),
      ]);
      setSub(nextSub);
      setEvents(nextEvents);
    } catch (err: any) {
      setError(err.message || 'Could not load the submission');
    }
  }
  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user, id]);

  useEffect(() => {
    if (user?.role !== 'admin' || !sub?.has_pdf) return;
    let objectUrl: string | null = null;
    apiBlobUrl(`/api/admin/submissions/${id}/download`)
      .then((url) => {
        objectUrl = url;
        setPdfUrl(url);
      })
      .catch((err) => setError(err.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfUrl(null);
    };
  }, [user, id, sub?.has_pdf]);

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

  async function openAttachment(event: SubmissionThreadEvent) {
    setError('');
    try {
      const url = await apiBlobUrl(`/api/admin/submissions/${id}/thread/${event.id}/download`);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setError(err.message || 'Could not open the attached PDF');
    }
  }

  if (loading) {
    return (
      <AppShell title="Review submission" subtitle="Loading the submitted paper.">
        <ReviewSkeleton />
      </AppShell>
    );
  }
  if (!sub) {
    return error ? (
      <AppShell
        title="Review submission"
        subtitle="The requested submission could not be loaded."
        actions={<Link href="/admin" className="btn-outline">← Back to review desk</Link>}
      >
        <Alert>{error}</Alert>
      </AppShell>
    ) : (
      <AppShell title="Review submission" subtitle="Loading the submitted paper.">
        <ReviewSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Review submission"
      subtitle="Read the paper details, view the PDF, and record the board decision."
      actions={<Link href="/admin" className="btn-outline">← Back to review desk</Link>}
    >
    <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

          {error && <Alert>{error}</Alert>}
          <ReviewThread
            events={events}
            viewerRole="admin"
            onOpenAttachment={openAttachment}
            composer={
              <AdminDecisionComposer
                status={sub.status}
                indexStatus={sub.index_status}
                comment={comment}
                busy={busy}
                onComment={setComment}
                onAction={act}
                paperHref={`/paper/${sub.id}`}
              />
            }
          />

          {sub.has_pdf ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" onClick={() => setDocumentOpen((value) => !value)} className="text-left text-sm font-semibold text-slate-700">
                  {documentOpen ? 'Hide document preview' : 'Show document preview'}
                </button>
                <div className="flex items-center gap-3">
                  {pdfUrl && (
                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                      Open in new tab
                    </a>
                  )}
                  <button type="button" onClick={() => setDocumentOpen((value) => !value)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {documentOpen ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
              {documentOpen && (pdfUrl ? <iframe src={pdfUrl} title="PDF" className="h-[70vh] w-full" /> : <div className="p-4"><Spinner label="Loading PDF…" /></div>)}
            </div>
          ) : (
            <Alert kind="info">No PDF was attached to this submission.</Alert>
          )}
        </div>
    </div>
    </AppShell>
  );
}

function ReviewSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-7 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-5 space-y-2">
              <div className="h-3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-11/12 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[#071826] px-5 py-4">
              <div className="h-5 w-48 animate-pulse rounded-full bg-white/20" />
            </div>
            <div className="space-y-4 bg-slate-50 p-5">
              <div className="h-24 w-2/3 animate-pulse rounded-2xl bg-white" />
              <div className="ml-auto h-24 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-36 animate-pulse rounded-2xl bg-white" />
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="h-[50vh] animate-pulse bg-slate-100" />
          </div>
        </div>
    </div>
  );
}
