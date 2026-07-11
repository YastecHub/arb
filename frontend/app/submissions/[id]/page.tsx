'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft02Icon, FileUploadIcon } from '@hugeicons/core-free-icons';
import AppShell from '@/components/AppShell';
import { api, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission, SubmissionThreadEvent } from '@/lib/types';
import { Alert, StatusBadge, Tag } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/icons';

export default function StudentSubmissionThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [events, setEvents] = useState<SubmissionThreadEvent[]>([]);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user?.role === 'admin') router.replace(`/admin/submissions/${id}`);
  }, [loading, user, router, id]);

  async function load() {
    try {
      const [nextSubmission, nextEvents] = await Promise.all([
        api<Submission>(`/api/submissions/${id}`, { auth: true }),
        api<SubmissionThreadEvent[]>(`/api/submissions/${id}/thread`, { auth: true }),
      ]);
      setSubmission(nextSubmission);
      setEvents(nextEvents);
    } catch (err: any) {
      setError(err.message || 'Could not load this review thread');
    }
  }

  useEffect(() => {
    if (user?.role === 'student') load();
  }, [user, id]);

  const closed = submission ? ['published', 'rejected', 'unpublished'].includes(submission.status) : false;
  const canResubmit = submission?.status === 'revision_requested';
  const latestFeedback = useMemo(
    () => [...events].reverse().find((event) => event.event_type === 'revision_requested' || event.event_type === 'rejected'),
    [events]
  );

  async function resubmit() {
    if (!submission || !canResubmit) return;
    setError('');
    if (!file) {
      setError('Please attach the revised PDF before resubmitting.');
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.set('note', note);
      fd.set('document', file);
      await apiUpload(`/api/submissions/${submission.id}/resubmit`, 'POST', fd, setProgress);
      setNote('');
      setFile(null);
      setProgress(null);
      await load();
    } catch (err: any) {
      setError(err.details?.[0]?.message || err.message || 'Could not resubmit this paper');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !submission) {
    return (
      <AppShell title="Review thread" subtitle="Loading the review discussion.">
        {error ? <Alert>{error}</Alert> : <ThreadSkeleton />}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Review thread"
      subtitle="Track ARB feedback, revision requests, and resubmissions for this paper."
      actions={<Link href="/dashboard" className="btn-outline"><Icon icon={ArrowLeft02Icon} className="h-4 w-4" /> Overview</Link>}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-[#071826]">{submission.title}</h2>
                  <StatusBadge status={submission.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {submission.department} {submission.session ? `· ${submission.session}` : ''} · updated {formatDate(submission.updated_at)}
                </p>
                {submission.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {submission.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  </div>
                )}
              </div>
              {closed && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Thread closed</span>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-[#071826]">Conversation</h3>
            <div className="mt-5 space-y-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">No review activity has been recorded yet.</p>
              ) : (
                events.map((event) => <ThreadEventCard key={event.id} event={event} />)
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {error && <Alert>{error}</Alert>}
          {latestFeedback?.body && (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-950">
              <p className="font-bold">Latest ARB feedback</p>
              <p className="mt-2 whitespace-pre-line">{latestFeedback.body}</p>
            </div>
          )}

          {canResubmit ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#071826]">Submit revised paper</h3>
              <p className="mt-1 text-sm text-slate-500">Upload the corrected PDF and add a short note for the reviewers.</p>
              <div className="mt-4 space-y-3">
                <textarea
                  className="input min-h-[120px]"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Briefly mention what you changed..."
                />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
                {progress !== null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{progress < 100 ? 'Uploading revised PDF…' : 'Saving resubmission…'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
                <button className="btn-primary w-full" disabled={busy} onClick={resubmit}>
                  <Icon icon={FileUploadIcon} className="h-4 w-4" />
                  {busy ? 'Resubmitting…' : 'Resubmit for review'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
              {closed
                ? 'This thread is closed because the review has reached a final decision.'
                : 'This paper is with ARB reviewers. You will be able to resubmit here if revisions are requested.'}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function ThreadEventCard({ event }: { event: SubmissionThreadEvent }) {
  const admin = event.actor_role === 'admin';
  const title = eventTitle(event.event_type);
  return (
    <div className={`rounded-2xl border p-4 ${admin ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[#071826]">{title}</p>
        <p className="text-xs text-slate-500">{formatDate(event.created_at)}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {event.actor_name || (admin ? 'ARB reviewer' : event.actor_role === 'student' ? 'Student' : 'System')}
      </p>
      {event.body && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{event.body}</p>}
      {event.has_pdf && <p className="mt-3 text-xs font-semibold text-slate-500">PDF attached to this update</p>}
    </div>
  );
}

function eventTitle(type: SubmissionThreadEvent['event_type']) {
  const labels: Record<SubmissionThreadEvent['event_type'], string> = {
    submitted: 'Submitted for review',
    revision_requested: 'Revision requested',
    resubmitted: 'Revised paper submitted',
    approved: 'Approved and published',
    rejected: 'Rejected',
    comment: 'Comment added',
    unpublished: 'Unpublished',
    republished: 'Republished',
  };
  return labels[type];
}

function ThreadSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        </div>
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-white" />
    </div>
  );
}

