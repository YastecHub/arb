'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, API_URL } from '@/lib/api';
import type { Paper } from '@/lib/types';
import { Tag, Spinner, Alert } from '@/components/ui';
import { formatDate } from '@/lib/format';
import PdfViewer from '@/components/PdfViewer';

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [error, setError] = useState('');
  const downloadUrl = `${API_URL}/api/library/${id}/download`;

  useEffect(() => {
    api<Paper>(`/api/library/${id}`)
      .then(setPaper)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!paper) return <Spinner label="Loading paper…" />;

  return (
    <article className="space-y-6">
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        ← Back to library
      </Link>

      <header className="card p-6">
        <h1 className="text-2xl font-bold leading-tight text-slate-800">{paper.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          By <span className="font-medium text-slate-700">{paper.author_name}</span>
          {paper.department ? ` · ${paper.department}` : ''}
          {paper.session ? ` · ${paper.session}` : ''}
        </p>
        <p className="mt-1 text-xs text-slate-400">Published {formatDate(paper.published_at)}</p>

        {paper.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {paper.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Open / Download PDF
          </a>
        </div>
      </header>

      <section className="card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Abstract</h2>
        <p className="whitespace-pre-line leading-relaxed text-slate-700">{paper.abstract}</p>
      </section>

      <PdfViewer url={downloadUrl} title={paper.title} />
    </article>
  );
}
