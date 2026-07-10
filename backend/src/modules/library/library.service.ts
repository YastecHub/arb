import { query } from '../../db/pool';
import { notFound } from '../../utils/http';
import { storage } from '../../lib/storage';

const CARD_COLS = `id, title, abstract, author_name, department, session, tags, published_at`;

export interface BrowseFilters {
  department?: string;
  session?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export async function browse(f: BrowseFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, f.pageSize ?? 12));
  const where: string[] = [`status = 'published'`];
  const params: any[] = [];

  if (f.department) {
    params.push(f.department);
    where.push(`department = $${params.length}`);
  }
  if (f.session) {
    params.push(f.session);
    where.push(`session = $${params.length}`);
  }
  if (f.tag) {
    params.push(f.tag);
    where.push(`$${params.length} = ANY(tags)`);
  }

  const whereSql = where.join(' AND ');
  const totalRes = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM submissions WHERE ${whereSql}`,
    params
  );
  const total = Number(totalRes.rows[0]?.count ?? 0);

  params.push(pageSize, (page - 1) * pageSize);
  const { rows } = await query(
    `SELECT ${CARD_COLS} FROM submissions
      WHERE ${whereSql}
      ORDER BY published_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function facets() {
  const [depts, sessions, tags] = await Promise.all([
    query<{ v: string }>(
      `SELECT DISTINCT department AS v FROM submissions WHERE status='published' AND department IS NOT NULL ORDER BY v`
    ),
    query<{ v: string }>(
      `SELECT DISTINCT session AS v FROM submissions WHERE status='published' AND session IS NOT NULL ORDER BY v DESC`
    ),
    query<{ v: string }>(
      `SELECT DISTINCT unnest(tags) AS v FROM submissions WHERE status='published' ORDER BY v`
    ),
  ]);
  return {
    departments: depts.rows.map((r) => r.v),
    sessions: sessions.rows.map((r) => r.v),
    tags: tags.rows.map((r) => r.v),
  };
}

export async function detail(id: string) {
  const { rows } = await query(
    `SELECT ${CARD_COLS} FROM submissions WHERE id = $1 AND status = 'published'`,
    [id]
  );
  if (!rows[0]) throw notFound('Paper not found or not published');
  return rows[0];
}

/** Returns the raw PDF bytes for a published paper (for download/streaming). */
export async function download(id: string): Promise<{ buffer: Buffer; filename: string }> {
  const { rows } = await query<{ pdf_key: string | null; title: string }>(
    `SELECT pdf_key, title FROM submissions WHERE id = $1 AND status = 'published'`,
    [id]
  );
  if (!rows[0] || !rows[0].pdf_key) throw notFound('Paper not found or not published');
  const buffer = await storage.get(rows[0].pdf_key);
  const filename = `${rows[0].title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.pdf`;
  return { buffer, filename };
}
