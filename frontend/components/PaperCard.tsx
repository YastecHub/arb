'use client';
import Link from 'next/link';
import type { Paper, SearchResult } from '@/lib/types';
import { Tag } from './ui';
import { formatDate } from '@/lib/format';

function HighlightedExcerpt({ value }: { value: string }) {
  const parts = value.split(/(<mark>|<\/mark>)/i);
  let highlighted = false;
  return (
    <p className="mb-3 text-sm leading-relaxed text-slate-600">
      {parts.map((part, index) => {
        if (part.toLowerCase() === '<mark>') {
          highlighted = true;
          return null;
        }
        if (part.toLowerCase() === '</mark>') {
          highlighted = false;
          return null;
        }
        return highlighted ? <mark key={index}>{part}</mark> : part;
      })}
    </p>
  );
}

export default function PaperCard({ paper }: { paper: Paper | SearchResult }) {
  const excerpt = (paper as SearchResult).excerpt;
  const matchType = (paper as SearchResult).matchType;
  return (
    <Link href={`/paper/${paper.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-snug text-[#071826] transition group-hover:text-[#9a6810]">{paper.title}</h3>
        {matchType === 'hybrid' && (
          <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
            AI match
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-slate-500">
        {paper.author_name}
        {paper.department ? ` · ${paper.department}` : ''}
        {paper.session ? ` · ${paper.session}` : ''} · {formatDate(paper.published_at)}
      </p>
      {excerpt ? (
        <HighlightedExcerpt value={excerpt} />
      ) : (
        <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{paper.abstract}</p>
      )}
      {paper.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {paper.tags.slice(0, 5).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
    </Link>
  );
}
