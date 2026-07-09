import type { SubmissionStatus } from './types';

export const STATUS_META: Record<SubmissionStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700' },
  pending_review: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-800' },
  revision_requested: { label: 'Revision Requested', cls: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  unpublished: { label: 'Unpublished', cls: 'bg-slate-200 text-slate-600' },
};

export function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
