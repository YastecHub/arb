'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpenTextIcon, ClipboardCheckIcon, FileSearchIcon, TimeQuarter02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission, Stats, SubmissionStatus } from '@/lib/types';
import { StatusBadge, EmptyState, Alert } from '@/components/ui';
import { formatDate } from '@/lib/format';
import AppShell from '@/components/AppShell';
import { Icon } from '@/components/icons';

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api<Stats>('/api/admin/stats', { auth: true }).then(setStats).catch((e) => setError(e.message));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setSubs(null);
    const status = TABS.find((t) => t.key === tab)?.status;
    const qs = status ? `?status=${status}` : '';
    setError('');
    api<Submission[]>(`/api/admin/submissions${qs}`, { auth: true })
      .then(setSubs)
      .catch((e) => { setError(e.message || 'Could not load submissions'); setSubs([]); });
  }, [tab, user]);

  if (loading || !user) return <AdminSkeleton />;

  return (
    <AppShell
      title="ARB review desk"
      subtitle="Review submissions, watch queue health, and manage published research from one workspace."
      actions={
        <Link href="/admin/published" className="btn-outline">
          <Icon icon={BookOpenTextIcon} className="h-4 w-4" />
          Manage published
        </Link>
      }
    >
      <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={UserGroupIcon} label="Students" value={stats.totalStudents} />
          <StatCard icon={FileSearchIcon} label="Submissions" value={stats.totalSubmissions} />
          <StatCard icon={TimeQuarter02Icon} label="Pending review" value={stats.byStatus.pending_review} accent="amber" />
          <StatCard icon={ClipboardCheckIcon} label="Published" value={stats.published} accent="green" />
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">Review queue</p>
            <h2 className="mt-1 text-xl font-black text-[#071826]">Submission decisions</h2>
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {TABS.map((t) => {
            const count = t.status && stats ? stats.byStatus[t.status] : undefined;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === t.key ? 'bg-[#071826] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {t.label}
                {count !== undefined ? ` (${count})` : ''}
              </button>
            );
          })}
          </div>
        </div>

        {!subs ? (
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="Nothing here." hint="No submissions in this category." />
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/admin/submissions/${s.id}`}
                className="flex flex-col gap-3 py-4 transition hover:bg-amber-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{s.title}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.author_name}
                    {s.department ? ` · ${s.department}` : ''} · submitted {formatDate(s.updated_at)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[#9a6a10]">Review -&gt;</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, accent }: { icon: any; label: string; value: number; accent?: 'amber' | 'green' }) {
  const tone = accent === 'amber' ? 'bg-amber-50 text-amber-700' : accent === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon icon={icon} />
      </div>
      <p className="mt-4 text-3xl font-black text-[#071826]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="relative left-1/2 -my-8 flex min-h-[calc(100vh-8rem)] w-screen -translate-x-1/2 items-center justify-center bg-[#f4f1e8] px-4">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
        <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="mt-5 h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
