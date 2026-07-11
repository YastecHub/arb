'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, apiBlobUrl, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Submission } from '@/lib/types';
import { Alert, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';
import { ACADEMIC_SESSIONS } from '@/lib/academicSessions';

function SubmitInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const editId = useSearchParams().get('id');

  const [form, setForm] = useState({ title: '', abstract: '', session: '', tags: '' });
  const [file, setFile] = useState<File | null>(null);
  const [hasExistingPdf, setHasExistingPdf] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [ready, setReady] = useState(!editId);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (editId) {
      api<Submission>(`/api/submissions/${editId}`, { auth: true })
        .then((s) => {
          setForm({ title: s.title, abstract: s.abstract, session: s.session ?? '', tags: s.tags.join(', ') });
          setHasExistingPdf(s.has_pdf);
          setReady(true);
        })
        .catch((e) => {
          setError(e.message || 'Could not load the submission');
          setLoadFailed(true);
          setReady(true);
        });
    }
  }, [editId]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(action: 'draft' | 'submit') {
    setError('');
    if (action === 'submit' && !file && !hasExistingPdf) {
      setError('Please attach your project PDF before submitting.');
      return;
    }
    setBusy(action);
    setUploadProgress(0);
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
        await apiUpload(`/api/submissions/${editId}`, 'PUT', fd, setUploadProgress);
        if (action === 'submit') await api(`/api/submissions/${editId}/submit`, { method: 'POST', auth: true });
      } else {
        await apiUpload('/api/submissions', 'POST', fd, setUploadProgress);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.details?.[0]?.message || err.message || 'Something went wrong');
      setBusy(null);
      setUploadProgress(null);
    }
  }

  async function openCurrentPdf() {
    if (!editId) return;
    setError('');
    try {
      const url = await apiBlobUrl(`/api/submissions/${editId}/download`);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setError(err.message || 'Could not load the PDF');
    }
  }

  if (loading || !ready) return <AppShell title="Submit research" subtitle="Loading your submission form."><Spinner label="Loading submission form…" /></AppShell>;
  if (loadFailed) {
    return (
      <AppShell title="Submit research" subtitle="Prepare and send your research paper for ARB review.">
        <div className="mx-auto max-w-3xl"><Alert>{error}</Alert></div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={editId ? 'Edit submission' : 'Submit research'}
      subtitle="Enter the paper details, attach the PDF, and send it to the Academic & Research Board for review."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save('submit');
          }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-white to-amber-50/70 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6a10]">Research paper details</p>
            <h2 className="mt-1 text-xl font-black text-[#071826]">{editId ? 'Update your paper' : 'New paper submission'}</h2>
          </div>

          <div className="space-y-5 p-5 md:p-6">
            {error && <Alert>{error}</Alert>}
            <div>
              <label className="label">Project title *</label>
              <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required minLength={3} />
            </div>
            <div>
              <label className="label">Abstract *</label>
              <textarea className="input min-h-[160px]" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Academic session *</label>
                <select className="input" value={form.session} onChange={(e) => set('session', e.target.value)} required>
                  <option value="">Select academic session</option>
                  {ACADEMIC_SESSIONS.map((session) => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Research areas</label>
                <input className="input" placeholder="machine learning, IoT" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Separate each research area with a comma.</p>
              </div>
            </div>
            <div>
              <label className="label">Project PDF {hasExistingPdf && !file ? '(current file kept unless replaced)' : '*'}</label>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
                <p className="mt-2 text-xs text-slate-500">Upload the complete paper as one PDF file. Maximum size: 30 MB.</p>
                {hasExistingPdf && !file && (
                  <button type="button" onClick={openCurrentPdf} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">
                    View current PDF
                  </button>
                )}
              </div>
            </div>

            {busy && uploadProgress !== null && (
              <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{uploadProgress < 100 ? 'Uploading document…' : 'Upload complete. Saving submission…'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="PDF upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                >
                  <div
                    className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="btn-primary" disabled={!!busy}>
                {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
              </button>
              <button type="button" className="btn-outline" disabled={!!busy} onClick={() => save('draft')}>
                {busy === 'draft' ? 'Saving…' : 'Save as draft'}
              </button>
            </div>
          </div>
        </form>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-[#071826] p-5 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Before you submit</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
            <p>Confirm that the title, abstract, academic session, and PDF are correct.</p>
            <p>Use clear research areas so the paper can be found easily after publication.</p>
            <p>Drafts stay private. Papers submitted for review are sent to ARB reviewers.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SubmitInner />
    </Suspense>
  );
}
