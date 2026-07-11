'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchError, setSearchError] = useState('');

  const [facets, setFacets] = useState<Facets>({ departments: [], sessions: [], tags: [] });
  const [filters, setFilters] = useState<{ department?: string; session?: string; tag?: string }>({});
  const [browse, setBrowse] = useState<Paper[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(0);
  const [loadingBrowse, setLoadingBrowse] = useState(true);
  const [browseError, setBrowseError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api<Facets>('/api/library/facets').then(setFacets).catch(() => {});
  }, []);

  const loadBrowse = useCallback(async () => {
    setLoadingBrowse(true);
    setBrowseError('');
    const params = new URLSearchParams({ page: String(browsePage), pageSize: '6' });
    if (filters.department) params.set('department', filters.department);
    if (filters.session) params.set('session', filters.session);
    if (filters.tag) params.set('tag', filters.tag);
    try {
      const res = await api<{ items: Paper[]; total: number; totalPages: number }>(`/api/library?${params}`);
      setBrowse(res.items);
      setBrowseTotal(res.total);
      setBrowseTotalPages(res.totalPages);
    } catch (err: any) {
      setBrowseError(err.message || 'Could not load the research library');
      setBrowse([]);
    } finally {
      setLoadingBrowse(false);
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
    setSearchError('');
    try {
      const res = await api<{
        results: SearchResult[];
        aiAvailable: boolean;
        total: number;
        totalPages: number;
      }>(`/api/library/search?q=${encodeURIComponent(query)}&mode=${searchMode}&page=${page}&pageSize=20`);
      setResults(res.results);
      setAiAvailable(res.aiAvailable);
      setSearchTotal(res.total);
      setSearchTotalPages(res.totalPages);
    } catch (err: any) {
      setSearchError(err.message || 'Search failed');
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
    setFilters((current) => ({ ...current, [key]: value }));
    setBrowsePage(1);
  }

  const showingSearch = q.trim().length > 0;

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2 overflow-hidden bg-[#f5f3ed]">
      <section className="relative bg-[#071826] text-white">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute -right-32 top-10 h-96 w-96 rounded-full border-[70px] border-amber-400/10" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-28 pt-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:pb-32 lg:pt-24">
          <div>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Student engineering research should be seen, read, and built upon.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              ResearchHub is the public archive of the ULES Academic &amp; Research Board: a place where people can find, review, and learn from engineering papers by University of Lagos students.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#library" className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-[#071826] transition hover:bg-amber-300">
                Read the papers <ArrowIcon />
              </a>
              <Link href="/register" className="inline-flex items-center rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Submit a paper
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[420px] lg:block" aria-hidden="true">
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-400" />
            <div className="absolute right-14 top-14 h-80 w-[22rem] rotate-3 rounded-2xl border border-white/20 bg-[#102b40] p-7 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Reviewed paper 024</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-7 space-y-3">
                <div className="h-2.5 w-4/5 rounded-full bg-white/80" />
                <div className="h-2.5 w-3/5 rounded-full bg-white/80" />
                <div className="mt-7 h-1.5 w-full rounded-full bg-white/15" />
                <div className="h-1.5 w-11/12 rounded-full bg-white/15" />
                <div className="h-1.5 w-5/6 rounded-full bg-white/15" />
                <div className="h-1.5 w-full rounded-full bg-white/15" />
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/5 p-4"><span className="block text-2xl font-display text-white">ARB</span><span className="text-[10px] uppercase tracking-widest text-slate-400">Reviewed</span></div>
                <div className="rounded-lg bg-white/5 p-4"><span className="block text-2xl font-display text-white">Open</span><span className="text-[10px] uppercase tracking-widest text-slate-400">For readers</span></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 rounded-xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="font-display text-3xl text-amber-300">10</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Engineering departments</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto -mb-px max-w-6xl px-4">
          <div className="translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl shadow-slate-950/20 sm:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3.5">
                <SearchIcon />
                <input
                  value={q}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={mode === 'ai' ? 'Describe a topic, problem, or research interest…' : 'Search paper titles, abstracts, authors, or full text…'}
                  className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Search the research library"
                />
                {searching && <Spinner />}
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
                <ModeButton active={mode === 'keyword'} onClick={() => onModeChange('keyword')}>Exact search</ModeButton>
                <ModeButton active={mode === 'ai'} onClick={() => onModeChange('ai')}>Topic search</ModeButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-28">
        {showingSearch ? (
          <SearchResults
            query={q}
            results={results}
            total={searchTotal}
            error={searchError}
            searching={searching}
            mode={mode}
            aiAvailable={aiAvailable}
            page={searchPage}
            totalPages={searchTotalPages}
            onPage={(page) => { setSearchPage(page); runSearch(q, mode, page); }}
          />
        ) : (
          <>
            <section id="about" className="scroll-mt-24 py-14 lg:py-20">
              <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
                <div>
                  <Eyebrow>Why this archive exists</Eyebrow>
                  <h2 className="mt-4 font-display text-4xl leading-tight tracking-[-0.03em] text-[#071826] sm:text-5xl">
                    So good student research does not disappear after submission.
                  </h2>
                </div>
                <div className="border-l-2 border-amber-400 pl-6 text-lg leading-8 text-slate-600">
                  The ULES Academic &amp; Research Board preserves engineering papers from University of Lagos students and makes approved work available for classmates, researchers, industry readers, and the wider public to examine.
                </div>
              </div>
              <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-3">
                <ValueCard number="01" title="Preserve" text="Keep completed engineering research accessible beyond submission and graduation." />
                <ValueCard number="02" title="Read" text="Let other students, lecturers, researchers, and interested readers examine the work." />
                <ValueCard number="03" title="Build forward" text="Help new projects begin from what has already been studied, tested, and documented." />
              </div>
            </section>

            <section className="my-8 overflow-hidden rounded-3xl bg-amber-400 px-6 py-10 text-[#071826] sm:px-10 lg:px-14">
              <div className="grid gap-8 md:grid-cols-3 md:items-center">
                <div className="md:col-span-1">
                  <p className="text-xs font-bold uppercase tracking-[0.22em]">The collection today</p>
                  <p className="mt-3 font-display text-3xl leading-tight">A growing record of student engineering work.</p>
                </div>
                <Metric value={String(browseTotal)} label="Published papers" />
                <Metric value={String(facets.departments.length || 10)} label="Departments represented" />
              </div>
            </section>

            <section className="py-16 lg:py-24">
              <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
                <div>
                  <Eyebrow>How papers enter the archive</Eyebrow>
                  <h2 className="mt-4 font-display text-4xl tracking-[-0.03em] text-[#071826]">Students submit. ARB reviews. Readers discover.</h2>
                  <p className="mt-5 leading-7 text-slate-600">The archive gives engineering students a formal place to submit completed work and gives the public a place to read approved papers.</p>
                </div>
                <div className="space-y-3">
                  <ProcessStep number="1" title="Paper submission" text="A UNILAG engineering student uploads a completed research paper with its abstract, department, session, and keywords." />
                  <ProcessStep number="2" title="ARB review" text="The Academic &amp; Research Board reads the submission, requests corrections where needed, and approves papers fit for the archive." />
                  <ProcessStep number="3" title="Public reading" text="Approved papers become searchable so students, reviewers, and outside readers can learn from what has been done." />
                </div>
              </div>
            </section>

            <LibrarySection
              papers={browse}
              total={browseTotal}
              loading={loadingBrowse}
              error={browseError}
              facets={facets}
              filters={filters}
              page={browsePage}
              totalPages={browseTotalPages}
              onFilter={setFilter}
              onClear={() => { setFilters({}); setBrowsePage(1); }}
              onPage={setBrowsePage}
            />

          </>
        )}
      </main>
    </div>
  );
}

function SearchResults(props: {
  query: string;
  results: SearchResult[] | null;
  total: number;
  error: string;
  searching: boolean;
  mode: Mode;
  aiAvailable: boolean;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-6">
        <div>
          <Eyebrow>Research library</Eyebrow>
          <h2 className="mt-3 font-display text-4xl text-[#071826]">
            {props.searching ? 'Searching the archive…' : `${props.total} result${props.total === 1 ? '' : 's'}`}
          </h2>
          <p className="mt-2 text-slate-500">For “{props.query}”</p>
        </div>
        {props.mode === 'ai' && !props.aiAvailable && <p className="text-sm text-slate-500">Using local semantic + keyword matching</p>}
      </div>
      {props.error ? (
        <EmptyState title={props.error} hint="Please try again." />
      ) : props.results?.length === 0 && !props.searching ? (
        <EmptyState title="No papers matched your search." hint="Try broader terms or switch search modes." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{props.results?.map((paper) => <PaperCard key={paper.id} paper={paper} />)}</div>
      )}
      {props.mode === 'keyword' && props.totalPages > 1 && !props.searching && (
        <Pagination page={props.page} totalPages={props.totalPages} onPage={props.onPage} />
      )}
    </section>
  );
}

function LibrarySection(props: {
  papers: Paper[];
  total: number;
  loading: boolean;
  error: string;
  facets: Facets;
  filters: { department?: string; session?: string; tag?: string };
  page: number;
  totalPages: number;
  onFilter: (key: 'department' | 'session' | 'tag', value?: string) => void;
  onClear: () => void;
  onPage: (page: number) => void;
}) {
  const active = props.filters.department || props.filters.session || props.filters.tag;
  return (
    <section id="library" className="scroll-mt-24 border-t border-slate-300 pt-16 lg:pt-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>Open research library</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-[-0.03em] text-[#071826] sm:text-5xl">Explore published work</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-500">Browse {props.total} reviewed paper{props.total === 1 ? '' : 's'} by discipline, academic session, or research theme.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl bg-[#0d293d] p-5 shadow-xl shadow-slate-900/10 lg:sticky lg:top-24">
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Refine collection</p>
              <p className="mt-1 text-sm text-slate-400">Narrow the research archive</p>
            </div>
            <FilterIcon />
          </div>
          <div className="space-y-5">
            <FilterSelect label="Department" value={props.filters.department} options={props.facets.departments} onChange={(value) => props.onFilter('department', value)} />
            <FilterSelect label="Academic session" value={props.filters.session} options={props.facets.sessions} onChange={(value) => props.onFilter('session', value)} />
            <FilterSelect label="Research theme" value={props.filters.tag} options={props.facets.tags} onChange={(value) => props.onFilter('tag', value)} />
          </div>
          {active && <button onClick={props.onClear} className="mt-6 w-full rounded-lg border border-amber-300/30 px-3 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-300/10">Reset filters</button>}
        </aside>
        <div>
          {props.error ? <EmptyState title={props.error} hint="Please try again." /> : props.loading ? <Spinner label="Loading published research…" /> : props.papers.length === 0 ? <EmptyState title="No papers match these filters." /> : (
            <div className="grid gap-4 md:grid-cols-2">{props.papers.map((paper) => <PaperCard key={paper.id} paper={paper} />)}</div>
          )}
          {props.totalPages > 1 && !props.loading && <Pagination page={props.page} totalPages={props.totalPages} onPage={props.onPage} />}
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`text-xs font-bold uppercase tracking-[0.22em] ${light ? 'text-amber-300' : 'text-[#9a6810]'}`}>{children}</p>;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 font-semibold transition ${active ? 'bg-[#071826] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{children}</button>;
}

function ValueCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="bg-white p-7 sm:p-8"><span className="font-mono text-xs text-[#b47b17]">{number}</span><h3 className="mt-8 font-display text-3xl text-[#071826]">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></div>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="border-l border-[#071826]/25 pl-6"><p className="font-display text-5xl font-semibold">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p></div>;
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-[48px_1fr]"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071826] font-display text-xl text-amber-300">{number}</span><div><h3 className="font-display text-2xl text-[#071826]">{title}</h3><p className="mt-2 leading-7 text-slate-600">{text}</p></div></div>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (value?: string) => void }) {
  if (!options.length) return null;
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-300">{label}</span><span className="relative block"><select className="w-full appearance-none rounded-xl border border-white/15 bg-white px-4 py-3 pr-10 text-sm font-medium text-[#071826] shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-300/30" value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}><option value="">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option}>{option}</option>)}</select><svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg></span></label>;
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return <div className="mt-8 flex items-center justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span className="text-sm text-slate-500">Page {page} of {totalPages}</span><button className="btn-outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button></div>;
}

function SearchIcon() {
  return <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>;
}

function ArrowIcon() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function FilterIcon() {
  return <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-amber-300"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" /></svg></span>;
}
