import { env } from '../config/env';

// Groq serves fast open LLMs (Llama). We use it as the "AI" layer for semantic
// search: understanding a natural-language query and re-ranking candidate papers
// by meaning. Groq has no embeddings endpoint, so recall is done with pgvector
// (local MiniLM embeddings) and Groq refines the ordering.

export const groqEnabled = () => Boolean(env.groq.apiKey);

interface ChatOpts {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
}

export async function groqChat(opts: ChatOpts): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.groq.model,
      temperature: opts.temperature ?? 0.1,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? '';
}

interface RerankInput {
  id: string;
  title: string;
  abstract: string;
}

/**
 * Ask Groq to score how well each candidate paper answers the query, by meaning.
 * Returns a map of id -> score in [0,1]. Falls back to empty map on any failure so
 * the caller can degrade to pure vector similarity.
 */
export async function groqRerank(
  query: string,
  candidates: RerankInput[]
): Promise<Record<string, number>> {
  if (!groqEnabled() || candidates.length === 0) return {};
  const list = candidates
    .map((c, i) => `${i + 1}. [id:${c.id}] ${c.title}\n   ${c.abstract.slice(0, 400)}`)
    .join('\n');
  const system =
    'You are a research librarian ranking papers by how well they answer a query, ' +
    'by MEANING not keyword overlap. Return strict JSON: {"scores":[{"id":"<id>","score":<0..1>}]}. ' +
    'Score 1 = directly answers the query, 0 = unrelated.';
  const user = `Query: "${query}"\n\nCandidate papers:\n${list}`;
  try {
    const raw = await groqChat({ system, user, json: true });
    const parsed = JSON.parse(raw);
    const map: Record<string, number> = {};
    for (const s of parsed.scores ?? []) {
      if (s && typeof s.id === 'string') map[s.id] = Math.max(0, Math.min(1, Number(s.score) || 0));
    }
    return map;
  } catch {
    return {};
  }
}
