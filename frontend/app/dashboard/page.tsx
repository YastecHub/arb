'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AiChat02Icon,
  BookOpenTextIcon,
  Calendar03Icon,
  Clock03Icon,
  FileUploadIcon,
  LibraryIcon,
  TaskDone01Icon,
  TimeQuarter02Icon,
} from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission, SubmissionStatus } from '@/lib/types';
import { StatusBadge, Alert, EmptyState, Tag } from '@/components/ui';
import { formatDate } from '@/lib/format';
import AppShell from '@/components/AppShell';
import { Icon } from '@/components/icons';

const ACTIVE = ['draft', 'pending_review', 'revision_requested'];

const STATUS_HELP: Record<SubmissionStatus, string> = {
  draft: 'Keep shaping the submission. Upload the PDF, abstract, session, and tags before sending it to review.',
  pending_review: 'The board has your paper. You can track the decision here while the review team reads through current submissions.',
  revision_requested: 'The board left feedback. Update your work and resubmit when the issues are addressed.',
  rejected: 'This submission was not accepted. You can read the comment and prepare a stronger future submission.',
  published: 'Your work is live in the public library. Share it, cite it, and let the next team build from it.',
  unpublished: 'This paper is currently hidden from the public library.',
};

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

  const stats = useMemo(() => {
    const list = subs ?? [];
    return {
      total: list.length,
      active: list.filter((s) => ACTIVE.includes(s.status)).length,
      published: list.filter((s) => s.status === 'published').length,
      pending: list.filter((s) => s.status === 'pending_review').length,
      needsWork: list.filter((s) => s.status === 'draft' || s.status === 'revision_requested').length,
    };
  }, [subs]);

  if (loading || !subs) return <DashboardSkeleton />;

  const hasActive = subs.some((s) => ACTIVE.includes(s.status));
  const activeSubmission = subs.find((s) => ACTIVE.includes(s.status));
  const recent = [...subs].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 4);

  return (
    <AppShell
      title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
      subtitle="Follow your research from draft to review, respond to feedback, and prepare it for publication."
    >
      <div className="space-y-6">
        {hasActive && (
          <Alert kind="info">You have an active submission. Finish or await a decision on it before starting a new one.</Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={BookOpenTextIcon} label="All submissions" value={stats.total} hint="Across every status" />
          <MetricCard icon={TimeQuarter02Icon} label="Pending review" value={stats.pending} hint="With ARB reviewers" tone="amber" />
          <MetricCard icon={TaskDone01Icon} label="Published" value={stats.published} hint="Visible in the library" tone="green" />
          <MetricCard icon={FileUploadIcon} label="Needs action" value={stats.needsWork} hint="Drafts or revisions" tone="blue" />
        </section>

        <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_24rem]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-white to-amber-50/70 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">Current paper</p>
              <h2 className="mt-1 text-xl font-black text-[#071826]">Your active work</h2>
            </div>

            {activeSubmission ? (
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold leading-tight text-slate-900">{activeSubmission.title}</h3>
                      <StatusBadge status={activeSubmission.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {activeSubmission.session ? `${activeSubmission.session} · ` : ''}Updated {formatDate(activeSubmission.updated_at)}
                    </p>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{activeSubmission.abstract}</p>
                    {activeSubmission.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {activeSubmission.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                    {(activeSubmission.status === 'draft' || activeSubmission.status === 'revision_requested') && (
                      <>
                        <Link href={`/submit?id=${activeSubmission.id}`} className="btn-outline">
                          Edit submission
                        </Link>
                        <button className="btn-primary" disabled={busyId === activeSubmission.id} onClick={() => submitForReview(activeSubmission.id)}>
                          {busyId === activeSubmission.id ? 'Submitting...' : activeSubmission.status === 'draft' ? 'Submit for review' : 'Resubmit'}
                        </button>
                      </>
                    )}
                    <Link href="/assistant" className="btn-ghost">
                      <Icon icon={AiChat02Icon} className="h-4 w-4" />
                      Ask Ada
                    </Link>
                  </div>
                </div>

                {activeSubmission.review_comment && (activeSubmission.status === 'revision_requested' || activeSubmission.status === 'rejected') && (
                  <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                    <span className="font-semibold">Board comment:</span> {activeSubmission.review_comment}
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-800">What this means:</span> {STATUS_HELP[activeSubmission.status]}
                </div>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState title="No active submission." hint="Start a new project submission when your work is ready for ARB review." />
                <div className="mt-4">
                  <Link href="/submit" className={`btn-primary ${hasActive ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={hasActive}>
                    <Icon icon={FileUploadIcon} className="h-4 w-4" />
                    New submission
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-[#071826] p-5 text-white shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-[#071826]">
                <Icon icon={AiChat02Icon} />
              </div>
              <h2 className="mt-4 text-lg font-bold">Engr. Ada Torque is on call.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ask about finding papers, choosing tags, understanding ARB feedback, or where to go next inside ResearchHub.
              </p>
              <Link href="/assistant" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#071826] hover:bg-amber-100">
                Open assistant
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-[#071826]">Helpful next steps</h2>
              <div className="mt-4 grid gap-2">
                <QuickLink icon={FileUploadIcon} href={hasActive ? '/dashboard' : '/submit'} label={hasActive ? 'Finish active submission' : 'Start a submission'} />
                <QuickLink icon={LibraryIcon} href="/library" label="Explore the research library" />
                <QuickLink icon={AiChat02Icon} href="/assistant" label="Ask Ada for guidance" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">Recent progress</p>
              <h2 className="mt-1 text-lg font-bold text-[#071826]">Your research record</h2>
            </div>
            <Link href="/submit" className={`btn-outline ${hasActive ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={hasActive}>
              <Icon icon={FileUploadIcon} className="h-4 w-4" />
              New submission
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="Nothing to show yet." hint="Your research activity will appear here once you create a submission." />
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {recent.map((submission) => (
                <div key={submission.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Icon icon={submission.status === 'published' ? TaskDone01Icon : Clock03Icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">{submission.title}</h3>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        <Icon icon={Calendar03Icon} className="mr-1 inline h-3.5 w-3.5" />
                        Updated {formatDate(submission.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {(submission.status === 'draft' || submission.status === 'revision_requested') && (
                      <Link href={`/submit?id=${submission.id}`} className="btn-outline">
                        Continue
                      </Link>
                    )}
                    {submission.status === 'published' && (
                      <Link href={`/paper/${submission.id}`} className="btn-outline">
                        View paper
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ icon, label, value, hint, tone }: { icon: any; label: string; value: number; hint: string; tone?: 'amber' | 'green' | 'blue' }) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'green'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'blue'
      ? 'bg-sky-50 text-sky-700'
      : 'bg-slate-100 text-slate-700';
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles}`}>
        <Icon icon={icon} />
      </div>
      <p className="mt-4 text-3xl font-black text-[#071826]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="relative left-1/2 -my-8 flex min-h-[calc(100vh-8rem)] w-screen -translate-x-1/2 items-center justify-center bg-[#f4f1e8] px-4">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-amber-200" />
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-72 max-w-[65vw] animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-100 p-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="mt-5 h-7 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-28 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ icon, href, label }: { icon: any; href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50">
      <span className="flex items-center gap-2">
        <Icon icon={icon} className="h-4 w-4 text-[#9a6a10]" />
        {label}
      </span>
      <span aria-hidden="true">-&gt;</span>
    </Link>
  );
}
