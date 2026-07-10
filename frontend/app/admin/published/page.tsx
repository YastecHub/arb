'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { StatusBadge, Spinner, Alert, EmptyState } from '@/components/ui';

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

  if (loading || !items) return <Spinner label="Loading papers…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Published papers</h1>
          <p className="text-sm text-slate-500">Edit metadata, unpublish, or re-publish papers.</p>
        </div>
        <Link href="/admin" className="btn-outline">
          ← Dashboard
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      {items.length === 0 ? (
        <EmptyState title="No published papers yet." />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="card p-4">
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
          session: form.session,
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
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="label">Session</label>
              <input className="input" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
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
