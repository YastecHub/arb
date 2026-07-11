'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { StatusBadge, Spinner, Alert, EmptyState } from '@/components/ui';
import { ENGINEERING_DEPARTMENTS } from '@/lib/departments';
import { ACADEMIC_SESSIONS } from '@/lib/academicSessions';
import AppShell from '@/components/AppShell';

export default function PublishedManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Submission[] | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/login');
  }, [loading, user, router]);

  async function load() {
    try {
      const [pub, unpub] = await Promise.all([
        api<Submission[]>('/api/admin/submissions?status=published', { auth: true }),
        api<Submission[]>('/api/admin/submissions?status=unpublished', { auth: true }),
      ]);
      setItems([...pub, ...unpub]);
    } catch (err: any) {
      setError(err.message || 'Could not load papers');
      setItems([]);
    }
  }
  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user]);

  async function toggle(s: Submission) {
    setBusyId(s.id);
    setError('');
    try {
      const action = s.status === 'published' ? 'unpublish' : 'republish';
      await api(`/api/admin/papers/${s.id}/${action}`, { method: 'POST', auth: true });
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update the paper');
    } finally {
      setBusyId('');
    }
  }

  if (loading || !items) {
    return (
      <AppShell title="Published papers" subtitle="Loading the published paper collection.">
        <Spinner label="Loading papers…" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Published papers"
      subtitle="Review published and unpublished papers, update metadata, and control public visibility."
      actions={
        <Link href="/admin" className="btn-outline">
          ← Review desk
        </Link>
      }
    >
      <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Paper collection</h2>
          <p className="text-sm text-slate-500">Edit metadata, unpublish, or re-publish papers.</p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {items.length === 0 ? (
        <EmptyState title="No published papers yet." />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-800">{s.title}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.author_name}
                    {s.department ? ` · ${s.department}` : ''}
                    {s.session ? ` · ${s.session}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-outline" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                  <button className="btn-ghost" disabled={busyId === s.id} onClick={() => toggle(s)}>
                    {s.status === 'published' ? 'Unpublish' : 'Re-publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          paper={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      </div>
    </AppShell>
  );
}

function EditModal({ paper, onClose, onSaved }: { paper: Submission; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: paper.title,
    abstract: paper.abstract,
    department: paper.department ?? '',
    session: paper.session ?? '',
    tags: paper.tags.join(', '),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setError('');
    setBusy(true);
    try {
      await api(`/api/admin/papers/${paper.id}`, {
        method: 'PUT',
        auth: true,
        body: {
          title: form.title,
          abstract: form.abstract,
          department: form.department,
          session: form.session || undefined,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        },
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Save failed');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Edit paper</h2>
        <div className="space-y-3">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Abstract</label>
            <textarea className="input min-h-[100px]" value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Department</label>
              <select className="input bg-white" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {ENGINEERING_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Session</label>
              <select className="input bg-white" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                <option value="">Select academic session</option>
                {ACADEMIC_SESSIONS.map((session) => (
                  <option key={session} value={session}>{session}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
