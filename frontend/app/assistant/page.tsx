'use client';

import { useEffect, useRef, useState } from 'react';
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
  assistant?: 'groq' | 'fallback';
}

interface AssistantResponse {
  answer: string;
  papers: SearchResult[];
  assistant: 'groq' | 'fallback';
  grounded: boolean;
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
      const history = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.text }));
      const response = await api<AssistantResponse>('/api/assistant/chat', {
        method: 'POST',
        body: {
          message: prompt,
          history,
          user: {
            role: user?.role ?? 'visitor',
            name: user?.name,
          },
        },
      });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.answer,
          papers: response.papers,
          assistant: response.assistant,
        },
      ]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            err.message ||
            'My wrench slipped. I could not reach the assistant service, but you can still use the Research library search while I tighten things back up.',
          assistant: 'fallback',
        },
      ]);
    } finally {
      setBusy(false);
    }
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
        {!mine && message.assistant === 'fallback' && (
          <div className="mb-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#9a6a10]">
            Safe mode
          </div>
        )}
        <FormattedText text={message.text} />
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

function FormattedText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) return <p>I do not have an answer for that yet.</p>;

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
        const numberLines = lines.filter((line) => /^\d+[.)]\s+/.test(line));

        if (bulletLines.length === lines.length) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInline(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        if (numberLines.length === lines.length) {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInline(line.replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index} className="whitespace-pre-line">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em] text-slate-800">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
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
