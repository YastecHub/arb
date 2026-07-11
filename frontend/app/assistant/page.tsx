'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AiChat02Icon,
  AiSearchIcon,
  BookOpenTextIcon,
  FileUploadIcon,
  LibraryIcon,
  SentIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Paper, SearchResult } from '@/lib/types';
import AppShell from '@/components/AppShell';
import { Alert, Spinner, Tag } from '@/components/ui';
import { Icon } from '@/components/icons';

interface Facets {
  departments: string[];
  sessions: string[];
  tags: string[];
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  papers?: SearchResult[];
}

const STARTERS = [
  'What papers are currently available?',
  'Find research on renewable energy',
  'Help me choose tags for a project',
  'How do I submit my paper?',
  'What can I do on this hub?',
];

export default function AssistantPage() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'hello',
      role: 'assistant',
      text:
        "Hi, I'm Engr. Ada Torque. Ask me to find papers, explain what is available in the hub, help with submission steps, or point you to the right page. I may occasionally over-tighten a metaphor, but the bolts will hold.",
    },
  ]);
  const [input, setInput] = useState('');
  const [facets, setFacets] = useState<Facets | null>(null);
  const [libraryPreview, setLibraryPreview] = useState<Paper[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api<Facets>('/api/library/facets'),
      api<{ items: Paper[] }>('/api/library?page=1&pageSize=5'),
    ])
      .then(([nextFacets, preview]) => {
        setFacets(nextFacets);
        setLibraryPreview(preview.items);
      })
      .catch((err: any) => setError(err.message || 'Ada could not inspect the library yet.'));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const totalAvailable = libraryPreview.length;
  const shellTitle = user ? 'Ask Engr. Ada Torque' : 'ResearchHub Assistant';
  const shellSubtitle = user
    ? 'Search the hub, plan your submission, and get navigation help from the ResearchHub assistant.'
    : 'A public assistant for discovering what is inside ResearchHub.';

  async function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: prompt };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setBusy(true);
    setError('');

    try {
      const response = await answer(prompt, facets, libraryPreview);
      setMessages((current) => [...current, response]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: err.message || 'My wrench slipped. Try that again in a moment.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function answer(prompt: string, currentFacets: Facets | null, currentPreview: Paper[]): Promise<Message> {
    const lower = prompt.toLowerCase();
    const wantsSubmit = /submit|upload|send|review|paper|project/.test(lower) && /how|where|help|start|submit|upload/.test(lower);
    const wantsAvailable = /available|currently|what.*hub|what.*library|departments|tags|sessions|papers|collection/.test(lower);
    const wantsTags = /tag|keyword|theme/.test(lower);
    const wantsNavigation = /where|navigate|page|dashboard|admin|login|library|find/.test(lower);
    const searchQuery = cleanSearchQuery(prompt);

    if (wantsSubmit) {
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text:
          'To submit research: go to Submit research, enter your title, abstract, academic session, tags, and upload the PDF. Drafts can be edited; once submitted, ARB reviews it. If reviewers request revision, your dashboard will show the comment and the resubmit action.',
      };
    }

    if (wantsTags) {
      const tagLine = currentFacets?.tags.length
        ? `The hub already uses tags like ${currentFacets.tags.slice(0, 10).join(', ')}.`
        : 'The production library is still light on tags, so choose precise phrases reviewers and future students would search for.';
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `${tagLine} Good tags usually name the method, domain, and outcome: for example "machine learning", "renewable energy", "traffic prediction", "assistive technology", or "process optimisation". Use 3 to 6 tags, not a whole abstract in tag clothing.`,
      };
    }

    if (wantsAvailable) {
      const countText = currentPreview.length
        ? `I can see published papers in the library. Here are a few currently visible.`
        : 'The public production library is currently empty. The system is working, but papers will appear after students submit and admins publish them.';
      const facetText = currentFacets
        ? ` Departments represented: ${currentFacets.departments.length || 0}. Sessions represented: ${currentFacets.sessions.length || 0}. Tags represented: ${currentFacets.tags.length || 0}.`
        : '';
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `${countText}${facetText}`,
        papers: currentPreview.map(toSearchResult),
      };
    }

    if (wantsNavigation && !/search|find|looking/.test(lower)) {
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text:
          'Navigation map: Dashboard shows your submissions and review status. Submit research is where students upload papers. Research library is public browsing and search. Admin review desk is for ARB decisions. Manage published papers is where admins edit or unpublish live papers.',
      };
    }

    const result = await api<{ results: SearchResult[]; total: number; aiAvailable: boolean }>(
      `/api/library/search?q=${encodeURIComponent(searchQuery)}&mode=keyword&page=1&pageSize=5`
    );

    if (!result.results.length) {
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        text:
          'I searched the library and did not find a matching published paper yet. Try broader terms, search by department or method, or check back after more ARB-approved papers are published.',
      };
    }

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: `I found ${result.total || result.results.length} matching paper${(result.total || result.results.length) === 1 ? '' : 's'}. Start with these; they look closest to what you asked for.`,
      papers: result.results,
    };
  }

  return (
    <AppShell title={shellTitle} subtitle={shellSubtitle}>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-[#071826] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-[#071826]">
                <Icon icon={AiChat02Icon} />
              </div>
              <div>
                <h1 className="font-bold">Engr. Ada Torque</h1>
                <p className="text-xs text-slate-300">ResearchHub guide, paper finder, and submission co-pilot</p>
              </div>
            </div>
          </div>

          {error && <div className="p-4"><Alert>{error}</Alert></div>}

          <div className="h-[58vh] overflow-y-auto bg-slate-50 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Spinner label="Ada is checking the hub..." />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => send(starter)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  {starter}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Ada to find papers, explain the hub, or guide your submission..."
                className="input min-h-12 flex-1"
              />
              <button className="btn-primary min-h-12 px-4" disabled={busy || !input.trim()} aria-label="Send message">
                <Icon icon={SentIcon} className="h-5 w-5" />
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <InfoCard
            icon={LibraryIcon}
            title="Current hub snapshot"
            text={`${totalAvailable ? 'Published papers are visible.' : 'No published papers are visible yet.'} Ada checks the live library and search API when you ask.`}
          />
          <InfoCard
            icon={AiSearchIcon}
            title="What Ada can do"
            text="Find matching papers, explain filters, suggest search terms, summarize available departments and tags, and point you to the right page."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#071826]">
              <Icon icon={SparklesIcon} className="h-4 w-4 text-[#9a6a10]" />
              Useful places
            </div>
            <div className="mt-4 grid gap-2">
              <Link href="/#library" className="btn-outline justify-start">
                <Icon icon={BookOpenTextIcon} className="h-4 w-4" />
                Research library
              </Link>
              <Link href="/submit" className="btn-outline justify-start">
                <Icon icon={FileUploadIcon} className="h-4 w-4" />
                Submit research
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const mine = message.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[46rem] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${mine ? 'bg-[#071826] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
        <p className="whitespace-pre-line">{message.text}</p>
        {message.papers && message.papers.length > 0 && (
          <div className="mt-3 grid gap-2">
            {message.papers.map((paper) => (
              <Link key={paper.id} href={`/paper/${paper.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-amber-300 hover:bg-amber-50">
                <p className="font-semibold text-[#071826]">{paper.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {paper.department || 'Engineering'} {paper.session ? `- ${paper.session}` : ''}
                </p>
                {paper.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {paper.tags.slice(0, 4).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-[#9a6a10]">
        <Icon icon={icon} />
      </div>
      <h2 className="mt-4 font-bold text-[#071826]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function cleanSearchQuery(prompt: string) {
  return prompt
    .replace(/^(find|search|show me|look for|looking for)\s+/i, '')
    .replace(/\b(papers?|research|projects?)\b/gi, '')
    .trim() || prompt;
}

function toSearchResult(paper: Paper): SearchResult {
  return { ...paper, score: 1, matchType: 'keyword' };
}
