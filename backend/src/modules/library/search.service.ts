import { query } from '../../db/pool';
import { embed, cosineSim } from '../../lib/embeddings';
import { groqRerank, groqEnabled } from '../../lib/groq';

const BASE_COLS = `s.id, s.title, s.abstract, s.author_name, s.department, s.session, s.tags, s.published_at`;

export interface SearchItem {
  id: string;
  title: string;
  abstract: string;
  author_name: string;
  department: string | null;
  session: string | null;
  tags: string[];
  published_at: string;
  score: number;
  excerpt?: string;
  matchType?: 'keyword' | 'semantic' | 'hybrid';
}

// Build a prefix tsquery ("neural:* & network:*") for partial-word + stem matching.
function toPrefixTsQuery(q: string): string {
  const tokens = q.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return tokens.map((t) => `${t}:*`).join(' & ');
}

/**
 * PRD 4.4.3 keyword search: title/abstract/tags/author/full text, relevance ranked
 * (title & abstract weighted above body), highlighted excerpts, trigram typo tolerance.
 */
export async function keywordSearch(q: string, limit = 20, offset = 0): Promise<SearchItem[]> {
  const tsq = toPrefixTsQuery(q);
  if (!tsq) return [];
  const { rows } = await query<any>(
    `SELECT ${BASE_COLS},
            ts_rank_cd(s.search_vector, query, 32) AS rank,
            similarity(s.title, $2) AS title_sim,
            ts_headline('english',
              left(coalesce(s.abstract,'') || ' ' || coalesce(s.full_text,''), 6000),
              query,
              'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MinWords=6,MaxWords=26,FragmentDelimiter= … ') AS excerpt
       FROM submissions s, to_tsquery('english', $1) query
      WHERE s.status = 'published'
        AND (s.search_vector @@ query OR s.title % $2 OR s.abstract % $2)
      ORDER BY rank DESC, title_sim DESC, s.published_at DESC
      LIMIT $3 OFFSET $4`,
    [tsq, q, limit, offset]
  );
  return rows.map((r) => ({
    ...r,
    score: Number(r.rank) + Number(r.title_sim) * 0.3,
    matchType: 'keyword' as const,
  }));
}

async function keywordSearchCount(q: string): Promise<number> {
  const tsq = toPrefixTsQuery(q);
  if (!tsq) return 0;
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count
       FROM submissions s, to_tsquery('english', $1) query
      WHERE s.status = 'published'
        AND (s.search_vector @@ query OR s.title % $2 OR s.abstract % $2)`,
    [tsq, q]
  );
  return Number(rows[0]?.count ?? 0);
}

async function vectorSearch(q: string, limit = 20): Promise<SearchItem[]> {
  const qvec = await embed(q);
  // Pull published papers with an embedding and rank by cosine similarity in-app.
  // Portable to any Postgres; fine at faculty scale (PRD assumption 8.2).
  const { rows } = await query<any>(
    `SELECT ${BASE_COLS}, s.embedding
       FROM submissions s
      WHERE s.status = 'published' AND s.embedding IS NOT NULL`
  );
  return rows
    .map((r) => {
      const { embedding, ...rest } = r;
      return { ...rest, score: cosineSim(qvec, embedding as number[]), matchType: 'semantic' as const };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function normalize(items: SearchItem[]): Map<string, number> {
  const max = Math.max(...items.map((i) => i.score), 1e-9);
  const min = Math.min(...items.map((i) => i.score), 0);
  const range = max - min || 1;
  const m = new Map<string, number>();
  for (const i of items) m.set(i.id, (i.score - min) / range);
  return m;
}

/**
 * PRD 4.4.4 AI-powered search: understands meaning via embeddings (pgvector recall),
 * combined with keyword results, then re-ranked by Groq's Llama for natural-language
 * relevance. Degrades gracefully to vector+keyword if Groq is unavailable.
 */
export async function aiSearch(q: string, limit = 20): Promise<SearchItem[]> {
  const [kw, vec] = await Promise.all([keywordSearch(q, 20), vectorSearch(q, 20)]);

  const byId = new Map<string, SearchItem>();
  for (const it of [...vec, ...kw]) if (!byId.has(it.id)) byId.set(it.id, it);

  const kwNorm = normalize(kw);
  const vecNorm = normalize(vec);
  const merged: SearchItem[] = [...byId.values()].map((it) => {
    const k = kwNorm.get(it.id) ?? 0;
    const v = vecNorm.get(it.id) ?? 0;
    const excerpt = kw.find((x) => x.id === it.id)?.excerpt;
    return { ...it, excerpt, score: 0.5 * v + 0.5 * k, matchType: 'hybrid' as const };
  });

  merged.sort((a, b) => b.score - a.score);
  const top = merged.slice(0, Math.max(limit, 10));

  // Groq semantic re-rank of the top candidates.
  if (groqEnabled()) {
    const scores = await groqRerank(
      q,
      top.map((t) => ({ id: t.id, title: t.title, abstract: t.abstract }))
    );
    if (Object.keys(scores).length) {
      for (const it of top) {
        const g = scores[it.id];
        if (g !== undefined) it.score = 0.55 * g + 0.45 * it.score;
      }
      top.sort((a, b) => b.score - a.score);
    }
  }

  return top.slice(0, limit);
}

export async function search(q: string, mode: 'keyword' | 'ai', page = 1, pageSize = 20) {
  const trimmed = q.trim();
  if (!trimmed) {
    return { mode, query: trimmed, aiAvailable: groqEnabled(), results: [] as SearchItem[], total: 0, page: 1, totalPages: 0 };
  }
  if (mode === 'ai') {
    const results = await aiSearch(trimmed, pageSize);
    return { mode, query: trimmed, aiAvailable: groqEnabled(), results, total: results.length, page: 1, totalPages: results.length ? 1 : 0 };
  }
  const safePage = Math.max(1, page);
  const [results, total] = await Promise.all([
    keywordSearch(trimmed, pageSize, (safePage - 1) * pageSize),
    keywordSearchCount(trimmed),
  ]);
  return {
    mode,
    query: trimmed,
    aiAvailable: groqEnabled(),
    results,
    total,
    page: safePage,
    totalPages: Math.ceil(total / pageSize),
  };
}
