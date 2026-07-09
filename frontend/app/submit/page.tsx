'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { Alert, Spinner } from '@/components/ui';

function SubmitInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const editId = useSearchParams().get('id');

  const [form, setForm] = useState({ title: '', abstract: '', session: '', tags: '' });
  const [file, setFile] = useState<File | null>(null);
  const [existingPdf, setExistingPdf] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const [ready, setReady] = useState(!editId);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (editId) {
      api<Submission>(`/api/submissions/${editId}`, { auth: true })
        .then((s) => {
          setForm({ title: s.title, abstract: s.abstract, session: s.session ?? '', tags: s.tags.join(', ') });
          setExistingPdf(s.pdf_url);
          setReady(true);
        })
        .catch((e) => setError(e.message));
    }
  }, [editId]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(action: 'draft' | 'submit') {
    setError('');
    if (action === 'submit' && !file && !existingPdf) {
      setError('Please attach your project PDF before submitting.');
      return;
    }
    setBusy(action);
    try {
      const fd = new FormData();
      fd.set('title', form.title);
      fd.set('abstract', form.abstract);
      fd.set('session', form.session);
      fd.set('tags', JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean)));
      fd.set('action', action);
      if (file) fd.set('document', file);

      if (editId) {
        // Update metadata/PDF, then optionally submit for review.
        await api(`/api/submissions/${editId}`, { method: 'PUT', body: fd, isForm: true, auth: true });
        if (action === 'submit') await api(`/api/submissions/${editId}/submit`, { method: 'POST', auth: true });
      } else {
        await api('/api/submissions', { method: 'POST', body: fd, isForm: true, auth: true });
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.details?.[0]?.message || err.message || 'Something went wrong');
      setBusy(null);
    }
  }

  if (loading || !ready) return <Spinner label="Loading…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">{editId ? 'Edit submission' : 'New submission'}</h1>
      <p className="mb-6 text-sm text-slate-500">
        Provide your project details and upload the full paper as a single PDF.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save('submit');
        }}
        className="card space-y-5 p-6"
      >
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label">Project title *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required minLength={3} />
        </div>
        <div>
          <label className="label">Abstract</label>
          <textarea className="input min-h-[140px]" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Academic session</label>
            <input className="input" placeholder="e.g. 2024/2025" value={form.session} onChange={(e) => set('session', e.target.value)} />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" placeholder="machine learning, IoT" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Project PDF {existingPdf && !file ? '(current file kept unless replaced)' : '*'}</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          {existingPdf && !file && (
            <a href={existingPdf} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-600 hover:underline">
              View current PDF
            </a>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={!!busy}>
            {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
          </button>
          <button type="button" className="btn-outline" disabled={!!busy} onClick={() => save('draft')}>
            {busy === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SubmitInner />
    </Suspense>
  );
}
