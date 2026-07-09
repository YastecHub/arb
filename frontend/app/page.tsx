'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Paper, SearchResult } from '@/lib/types';
import PaperCard from '@/components/PaperCard';
import { Spinner, EmptyState } from '@/components/ui';

type Mode = 'keyword' | 'ai';
interface Facets {
  departments: string[];
  sessions: string[];
  tags: string[];
}

export default function HomePage() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<Mode>('keyword');
  const [aiAvailable, setAiAvailable] = useState(true);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const [facets, setFacets] = useState<Facets>({ departments: [], sessions: [], tags: [] });
  const [filters, setFilters] = useState<{ department?: string; session?: string; tag?: string }>({});
  const [browse, setBrowse] = useState<Paper[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api<Facets>('/api/library/facets').then(setFacets).catch(() => {});
  }, []);

  const loadBrowse = useCallback(async () => {
    setLoadingBrowse(true);
    const params = new URLSearchParams();
    if (filters.department) params.set('department', filters.department);
    if (filters.session) params.set('session', filters.session);
    if (filters.tag) params.set('tag', filters.tag);
    params.set('pageSize', '24');
    try {
      const res = await api<{ items: Paper[]; total: number }>(`/api/library?${params.toString()}`);
      setBrowse(res.items);
      setBrowseTotal(res.total);
    } finally {
      setLoadingBrowse(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  const runSearch = useCallback(
    async (query: string, m: Mode) => {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await api<{ results: SearchResult[]; aiAvailable: boolean }>(
          `/api/library/search?q=${encodeURIComponent(query)}&mode=${m}`
        );
        setResults(res.results);
        setAiAvailable(res.aiAvailable);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  function onQueryChange(value: string) {
    setQ(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(value, mode), 350);
  }

  function onModeChange(m: Mode) {
    setMode(m);
    if (q.trim()) runSearch(q, m);
  }

  const showingSearch = q.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Hero + search */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 px-6 py-12 text-white shadow-sm">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">UNILAG Engineering Research Library</h1>
          <p className="mt-2 text-brand-100">
            Search approved research projects by keyword, or describe what you need in plain language.
          </p>

          <div className="mt-6">
            <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-lg">
              <svg className="ml-2 h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input
                autoFocus
                value={q}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={
                  mode === 'ai'
                    ? 'e.g. how can I reduce water usage on a farm?'
                    : 'e.g. neural network, biodiesel, concrete...'
                }
                className="flex-1 bg-transparent px-1 py-2 text-slate-800 outline-none"
              />
              {searching && <Spinner />}
            </div>

            <div className="mt-3 inline-flex rounded-lg bg-brand-800/40 p-1 text-sm">
              <button
                onClick={() => onModeChange('keyword')}
                className={`rounded-md px-4 py-1.5 font-medium transition ${
                  mode === 'keyword' ? 'bg-white text-brand-700' : 'text-brand-100 hover:text-white'
                }`}
              >
                Keyword
              </button>
              <button
                onClick={() => onModeChange('ai')}
                className={`rounded-md px-4 py-1.5 font-medium transition ${
                  mode === 'ai' ? 'bg-white text-brand-700' : 'text-brand-100 hover:text-white'
                }`}
              >
                ✨ AI Search
              </button>
            </div>
            {mode === 'ai' && !aiAvailable && (
              <p className="mt-2 text-xs text-brand-100">
                AI reranking key not set — showing semantic + keyword blend.
              </p>
            )}
          </div>
        </div>
      </section>

      {showingSearch ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-700">
            {searching ? 'Searching…' : `${results?.length ?? 0} result${results?.length === 1 ? '' : 's'} for "${q}"`}
          </h2>
          {results && results.length === 0 && !searching ? (
            <EmptyState title="No papers matched your search." hint="Try different words or switch to AI Search." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {results?.map((r) => (
                <PaperCard key={r.id} paper={r} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Filters */}
          <aside className="space-y-5">
            <FilterGroup
              title="Department"
              options={facets.departments}
              value={filters.department}
              onChange={(v) => setFilters((f) => ({ ...f, department: v }))}
            />
            <FilterGroup
              title="Session"
              options={facets.sessions}
              value={filters.session}
              onChange={(v) => setFilters((f) => ({ ...f, session: v }))}
            />
            <FilterGroup
              title="Tag"
              options={facets.tags}
              value={filters.tag}
              onChange={(v) => setFilters((f) => ({ ...f, tag: v }))}
            />
          </aside>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-700">
                {browseTotal} published paper{browseTotal === 1 ? '' : 's'}
              </h2>
              {(filters.department || filters.session || filters.tag) && (
                <button onClick={() => setFilters({})} className="text-sm text-brand-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
            {loadingBrowse ? (
              <Spinner label="Loading library…" />
            ) : browse.length === 0 ? (
              <EmptyState title="No papers here yet." hint="Published papers will appear in the library." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {browse.map((p) => (
                  <PaperCard key={p.id} paper={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-1">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(value === o ? undefined : o)}
            className={`block w-full truncate rounded-md px-2 py-1 text-left text-sm transition ${
              value === o ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
