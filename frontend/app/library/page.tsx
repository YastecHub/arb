'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AiChat02Icon,
  AiSearchIcon,
  BookOpenTextIcon,
  FilterIcon,
  LibraryIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import type { Paper, SearchResult } from '@/lib/types';
import AppShell from '@/components/AppShell';
import PaperCard from '@/components/PaperCard';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { Icon } from '@/components/icons';

type Mode = 'keyword' | 'ai';

interface Facets {
  departments: string[];
  sessions: string[];
  tags: string[];
}

export default function AppLibraryPage() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<Mode>('keyword');
  const [facets, setFacets] = useState<Facets>({ departments: [], sessions: [], tags: [] });
  const [filters, setFilters] = useState<{ department?: string; session?: string; tag?: string }>({});
  const [browse, setBrowse] = useState<Paper[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(0);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api<Facets>('/api/library/facets').then(setFacets).catch(() => {});
  }, []);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(browsePage), pageSize: '9' });
    if (filters.department) params.set('department', filters.department);
    if (filters.session) params.set('session', filters.session);
    if (filters.tag) params.set('tag', filters.tag);
    try {
      const res = await api<{ items: Paper[]; total: number; totalPages: number }>(`/api/library?${params}`);
      setBrowse(res.items);
      setBrowseTotal(res.total);
      setBrowseTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Could not open the research library');
      setBrowse([]);
    } finally {
      setLoading(false);
    }
  }, [filters, browsePage]);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  const runSearch = useCallback(async (query: string, searchMode: Mode, page = 1) => {
    if (!query.trim()) {
      setResults(null);
      setSearchTotal(0);
      return;
    }
    setSearching(true);
    setError('');
    try {
      const res = await api<{ results: SearchResult[]; total: number; totalPages: number }>(
        `/api/library/search?q=${encodeURIComponent(query)}&mode=${searchMode}&page=${page}&pageSize=12`
      );
      setResults(res.results);
      setSearchTotal(res.total);
      setSearchTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || 'Search could not be completed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function onQueryChange(value: string) {
    setQ(value);
    setSearchPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(value, mode, 1), 350);
  }

  function onModeChange(nextMode: Mode) {
    setMode(nextMode);
    setSearchPage(1);
    if (q.trim()) runSearch(q, nextMode, 1);
  }

  function setFilter(key: 'department' | 'session' | 'tag', value?: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setBrowsePage(1);
  }

  const showingSearch = q.trim().length > 0;
  const shown = showingSearch ? results ?? [] : browse;
  const page = showingSearch ? searchPage : browsePage;
  const totalPages = showingSearch ? searchTotalPages : browseTotalPages;

  return (
    <AppShell
      title="Research library"
      subtitle="Search approved papers, browse by department, and find work that can guide your next study."
      actions={
        <a href="/assistant" className="btn-outline">
          <Icon icon={AiChat02Icon} className="h-4 w-4" />
          Ask Ada to help search
        </a>
      }
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-[#071826] p-5 text-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Collection search</p>
              <label className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 text-slate-900 shadow-sm">
                <Icon icon={Search01Icon} className="h-5 w-5 text-slate-400" />
                <input
                  value={q}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={mode === 'ai' ? 'Describe the research topic you need...' : 'Search by title, author, abstract, or paper text...'}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {searching && <Spinner />}
              </label>
            </div>
            <div className="flex rounded-2xl bg-white/10 p-1 text-sm">
              <ModeButton active={mode === 'keyword'} onClick={() => onModeChange('keyword')}>Exact search</ModeButton>
              <ModeButton active={mode === 'ai'} onClick={() => onModeChange('ai')}>Meaning search</ModeButton>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={BookOpenTextIcon} label="Published papers" value={browseTotal} />
          <SummaryCard icon={LibraryIcon} label="Departments represented" value={facets.departments.length} />
          <SummaryCard icon={AiSearchIcon} label="Research themes" value={facets.tags.length} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[18rem_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Icon icon={FilterIcon} className="h-5 w-5 text-[#9a6a10]" />
              <h2 className="font-bold text-[#071826]">Refine the collection</h2>
            </div>
            <div className="mt-5 space-y-4">
              <FilterSelect label="Department" value={filters.department} options={facets.departments} onChange={(value) => setFilter('department', value)} />
              <FilterSelect label="Academic session" value={filters.session} options={facets.sessions} onChange={(value) => setFilter('session', value)} />
              <FilterSelect label="Research theme" value={filters.tag} options={facets.tags} onChange={(value) => setFilter('tag', value)} />
              <button className="btn-outline w-full" onClick={() => { setFilters({}); setBrowsePage(1); }}>
                Clear filters
              </button>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#071826]">
                  {showingSearch ? `${searchTotal || shown.length} search result${(searchTotal || shown.length) === 1 ? '' : 's'}` : `${browseTotal} published paper${browseTotal === 1 ? '' : 's'}`}
                </p>
                <p className="text-xs text-slate-500">
                  {showingSearch ? `Showing papers related to "${q.trim()}".` : 'Browse the approved collection.'}
                </p>
              </div>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading && !showingSearch ? (
              <LibrarySkeleton />
            ) : shown.length === 0 ? (
              <EmptyState title="No papers found." hint={showingSearch ? 'Try broader words or ask Ada to help search.' : 'Published research will appear here after ARB approval.'} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {shown.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <button
                  className="btn-outline"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    showingSearch ? (setSearchPage(next), runSearch(q, mode, next)) : setBrowsePage(next);
                  }}
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-600">Page {page} of {totalPages}</span>
                <button
                  className="btn-outline"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = page + 1;
                    showingSearch ? (setSearchPage(next), runSearch(q, mode, next)) : setBrowsePage(next);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-xl px-4 py-2 font-semibold transition ${active ? 'bg-white text-[#071826]' : 'text-slate-300 hover:text-white'}`}>
      {children}
    </button>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (value?: string) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SummaryCard({ icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-[#071826]">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#9a6a10]">
          <Icon icon={icon} />
        </div>
      </div>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}
