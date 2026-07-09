'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission, Stats, SubmissionStatus } from '@/lib/types';
import { StatusBadge, Spinner, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/format';

const TABS: { key: string; label: string; status?: SubmissionStatus }[] = [
  { key: 'pending_review', label: 'Pending', status: 'pending_review' },
  { key: 'revision_requested', label: 'In Revision', status: 'revision_requested' },
  { key: 'published', label: 'Published', status: 'published' },
  { key: 'rejected', label: 'Rejected', status: 'rejected' },
  { key: 'all', label: 'All' },
];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState('pending_review');
  const [subs, setSubs] = useState<Submission[] | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'admin') api<Stats>('/api/admin/stats', { auth: true }).then(setStats);
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setSubs(null);
    const status = TABS.find((t) => t.key === tab)?.status;
    const qs = status ? `?status=${status}` : '';
    api<Submission[]>(`/api/admin/submissions${qs}`, { auth: true }).then(setSubs);
  }, [tab, user]);

  if (loading || !user) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Students" value={stats.totalStudents} />
          <StatCard label="Submissions" value={stats.totalSubmissions} />
          <StatCard label="Pending review" value={stats.byStatus.pending_review} accent="amber" />
          <StatCard label="Published" value={stats.published} accent="green" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((t) => {
            const count = t.status && stats ? stats.byStatus[t.status] : undefined;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
                {count !== undefined ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
        <Link href="/admin/published" className="btn-outline">
          Manage published
        </Link>
      </div>

      {!subs ? (
        <Spinner label="Loading submissions…" />
      ) : subs.length === 0 ? (
        <EmptyState title="Nothing here." hint="No submissions in this category." />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Link
              key={s.id}
              href={`/admin/submissions/${s.id}`}
              className="card flex items-center justify-between gap-4 p-4 transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-800">{s.title}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {s.author_name}
                  {s.department ? ` · ${s.department}` : ''} · submitted {formatDate(s.updated_at)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-brand-600">Review →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'green' }) {
  const color = accent === 'amber' ? 'text-amber-600' : accent === 'green' ? 'text-green-600' : 'text-slate-800';
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
