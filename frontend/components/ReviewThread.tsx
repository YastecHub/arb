'use client';

import {
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  FileUploadIcon,
  Message01Icon,
  SentIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import Link from 'next/link';
import type { SubmissionStatus, SubmissionThreadEvent, ThreadEventType } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Icon } from './icons';

const EVENT_LABELS: Record<ThreadEventType, string> = {
  submitted: 'Submitted for review',
  revision_requested: 'Revision requested',
  resubmitted: 'Revised paper submitted',
  approved: 'Approved and published',
  rejected: 'Review closed',
  comment: 'Comment',
  unpublished: 'Unpublished',
  republished: 'Republished',
};

const EVENT_ACCENTS: Record<ThreadEventType, string> = {
  submitted: 'bg-sky-100 text-sky-700',
  revision_requested: 'bg-orange-100 text-orange-700',
  resubmitted: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  comment: 'bg-slate-100 text-slate-700',
  unpublished: 'bg-slate-200 text-slate-700',
  republished: 'bg-green-100 text-green-700',
};

export function ReviewThread({
  events,
  viewerRole,
  composer,
  onOpenAttachment,
}: {
  events: SubmissionThreadEvent[];
  viewerRole: 'student' | 'admin';
  composer?: React.ReactNode;
  onOpenAttachment?: (event: SubmissionThreadEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-[#071826] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#071826]">
            <Icon icon={Message01Icon} className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Review conversation</h3>
            <p className="text-xs text-slate-300">ARB feedback, student responses, and submission updates</p>
          </div>
        </div>
      </div>

      <div className="max-h-[64vh] space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.13),transparent_35%),linear-gradient(180deg,#f8fafc,#f1f5f9)] p-4 md:p-5">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
            No review messages have been recorded yet.
          </div>
        ) : (
          events.map((event, index) => (
            <ThreadBubble
              key={event.id}
              event={event}
              viewerRole={viewerRole}
              onOpenAttachment={onOpenAttachment}
              showDate={index === 0 || dayKey(events[index - 1].created_at) !== dayKey(event.created_at)}
            />
          ))
        )}
      </div>
      {composer && <div className="border-t border-slate-200 bg-white p-4">{composer}</div>}
    </div>
  );
}

function ThreadBubble({
  event,
  viewerRole,
  showDate,
  onOpenAttachment,
}: {
  event: SubmissionThreadEvent;
  viewerRole: 'student' | 'admin';
  showDate: boolean;
  onOpenAttachment?: (event: SubmissionThreadEvent) => void;
}) {
  const mine = event.actor_role === viewerRole;
  const system = ['approved', 'rejected', 'unpublished', 'republished'].includes(event.event_type);
  const author = event.actor_name || (event.actor_role === 'admin' ? 'ARB reviewer' : event.actor_role === 'student' ? 'Student' : 'System');

  if (system) {
    return (
      <div>
        {showDate && <DatePill date={event.created_at} />}
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-sm">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Icon icon={event.event_type === 'approved' || event.event_type === 'republished' ? CheckmarkCircle02Icon : Message01Icon} className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-[#071826]">{EVENT_LABELS[event.event_type]}</p>
          {event.body && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{event.body}</p>}
          <p className="mt-2 text-[11px] text-slate-400">{timeOnly(event.created_at)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showDate && <DatePill date={event.created_at} />}
      <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine && <Avatar role={event.actor_role} />}
        <div className={`max-w-[min(34rem,82%)] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`mb-1 flex items-center gap-2 px-1 text-[11px] ${mine ? 'justify-end text-slate-500' : 'text-slate-500'}`}>
            <span>{author}</span>
            <span>·</span>
            <span>{timeOnly(event.created_at)}</span>
          </div>
          <div
            className={`relative rounded-2xl px-4 py-3 shadow-sm ${
              mine
                ? 'rounded-br-md bg-[#071826] text-white'
                : event.actor_role === 'admin'
                ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-slate-800'
                : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${mine ? 'bg-white/10 text-amber-200' : EVENT_ACCENTS[event.event_type]}`}>
              {EVENT_LABELS[event.event_type]}
            </div>
            {event.body && <p className="whitespace-pre-line text-sm leading-6">{event.body}</p>}
            {event.has_pdf && (
              <button
                type="button"
                onClick={() => onOpenAttachment?.(event)}
                className={`mt-3 flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:scale-[1.01] ${
                  mine ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon icon={FileAttachmentIcon} className="h-4 w-4" />
                <span className="truncate">{event.pdf_name || 'Attached PDF'}</span>
              </button>
            )}
          </div>
        </div>
        {mine && <Avatar role={event.actor_role} />}
      </div>
    </div>
  );
}

function DatePill({ date }: { date: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">{formatDate(date)}</span>
    </div>
  );
}

function Avatar({ role }: { role: SubmissionThreadEvent['actor_role'] }) {
  const admin = role === 'admin';
  return (
    <div className={`mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${admin ? 'bg-amber-400 text-[#071826]' : 'bg-slate-200 text-slate-700'}`}>
      <Icon icon={admin ? SentIcon : UserIcon} className="h-4 w-4" />
    </div>
  );
}

function dayKey(date: string) {
  return new Date(date).toDateString();
}

function timeOnly(date: string) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function RevisionComposer({
  note,
  fileName,
  progress,
  busy,
  onNote,
  onFile,
  onSubmit,
}: {
  note: string;
  fileName?: string;
  progress: number | null;
  busy: boolean;
  onNote: (value: string) => void;
  onFile: (file: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-bold text-[#071826]">Reply with revised paper</h3>
        <p className="mt-1 text-sm text-slate-500">Write a short response and attach the corrected PDF.</p>
      </div>
      <div className="space-y-3 p-4">
        <textarea
          className="input min-h-[120px] rounded-2xl"
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Type your response to ARB feedback..."
        />
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 transition hover:border-amber-300 hover:bg-amber-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#071826] shadow-sm">
            <Icon icon={FileUploadIcon} className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-slate-800">{fileName || 'Attach revised PDF'}</span>
            <span className="block text-xs text-slate-500">PDF only, maximum 30 MB</span>
          </span>
          <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
        </label>
        {progress !== null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{progress < 100 ? 'Uploading revised PDF…' : 'Saving resubmission…'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy} onClick={onSubmit}>
          <Icon icon={SentIcon} className="h-4 w-4" />
          {busy ? 'Sending…' : 'Send revised paper'}
        </button>
      </div>
    </div>
  );
}

export function WaitingComposer({ closed }: { closed: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
      {closed
        ? 'This review conversation is closed because a final decision has been recorded.'
        : 'This paper is currently with ARB reviewers. Reply options will appear here if revisions are requested.'}
    </div>
  );
}

export function AdminDecisionComposer({
  status,
  indexStatus,
  comment,
  busy,
  onComment,
  onAction,
  paperHref,
}: {
  status: SubmissionStatus;
  indexStatus?: string;
  comment: string;
  busy: string;
  onComment: (value: string) => void;
  onAction: (action: 'approve' | 'request-revision' | 'reject' | 'unpublish' | 'republish') => void;
  paperHref: string;
}) {
  if (status === 'pending_review') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="font-bold text-[#071826]">Reply as ARB reviewer</h3>
          <p className="mt-1 text-sm text-slate-500">Write feedback, then choose the review decision.</p>
        </div>
        <textarea
          className="input min-h-[120px] rounded-2xl"
          placeholder="Type review comments here..."
          value={comment}
          onChange={(event) => onComment(event.target.value)}
        />
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <button className="btn-primary" disabled={!!busy} onClick={() => onAction('approve')}>
            {busy === 'approve' ? 'Publishing…' : 'Approve & publish'}
          </button>
          <button className="btn-outline" disabled={!!busy} onClick={() => onAction('request-revision')}>
            {busy === 'request-revision' ? 'Sending…' : 'Request revision'}
          </button>
          <button className="btn-danger" disabled={!!busy} onClick={() => onAction('reject')}>
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'published') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold">This paper is live in the public library.</p>
          {indexStatus && <p className="mt-1 text-xs">Index status: {indexStatus}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" disabled={!!busy} onClick={() => onAction('unpublish')}>
            {busy === 'unpublish' ? 'Unpublishing…' : 'Unpublish'}
          </button>
          <Link href={paperHref} className="btn-ghost">
            View in library
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'unpublished') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold">This paper is currently hidden from the public library.</p>
        <button className="btn-primary" disabled={!!busy} onClick={() => onAction('republish')}>
          {busy === 'republish' ? 'Republishing…' : 'Re-publish'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
      This paper is currently marked as <strong>{status.replace('_', ' ')}</strong>. No reviewer action is available right now.
    </div>
  );
}
