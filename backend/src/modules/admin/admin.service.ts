import { query } from '../../db/pool';
import { badRequest, conflict, notFound } from '../../utils/http';
import { storage } from '../../lib/storage';
import { scheduleIndexing } from '../../lib/indexing';
import { createNotification } from '../notifications/notifications.service';

async function getSubmissionOrThrow(id: string) {
  const { rows } = await query<any>(`SELECT * FROM submissions WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('Submission not found');
  return rows[0];
}

export async function listSubmissions(status?: string) {
  const params: any[] = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE s.status = $1`;
  }
  const { rows } = await query(
    `SELECT s.id, s.title, s.abstract, s.author_name, s.matric_number, s.department,
            s.session, s.tags, s.status, s.review_comment, (s.pdf_key IS NOT NULL) AS has_pdf, s.index_status,
            s.published_at, s.created_at, s.updated_at, u.email AS author_email
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       ${where}
       ORDER BY
         CASE s.status WHEN 'pending_review' THEN 0 WHEN 'revision_requested' THEN 1 ELSE 2 END,
         s.updated_at ASC`,
    params
  );
  return rows;
}

export async function getSubmission(id: string) {
  const { rows } = await query(
    `SELECT s.id, s.title, s.abstract, s.author_name, s.matric_number, s.department,
            s.session, s.tags, s.status, s.review_comment, (s.pdf_key IS NOT NULL) AS has_pdf,
            s.index_status, s.published_at, s.created_at, s.updated_at, u.email AS author_email
       FROM submissions s
       JOIN users u ON u.id = s.student_id
      WHERE s.id = $1`,
    [id]
  );
  if (!rows[0]) throw notFound('Submission not found');
  return rows[0];
}

export async function downloadSubmission(id: string): Promise<{ buffer: Buffer; filename: string }> {
  const sub = await getSubmissionOrThrow(id);
  if (!sub.pdf_key) throw notFound('Submission PDF not found');
  return {
    buffer: await storage.get(sub.pdf_key),
    filename: `${sub.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.pdf`,
  };
}

export async function approve(id: string) {
  const sub = await getSubmissionOrThrow(id);
  if (sub.status !== 'pending_review') throw conflict('Only a pending submission can be approved');
  if (!sub.pdf_key) throw badRequest('A submission without a PDF cannot be published');
  const { rows } = await query(
    `UPDATE submissions
        SET status = 'published',
            published_at = COALESCE(published_at, now()),
            index_status = 'processing',
            updated_at = now()
      WHERE id = $1 AND status = 'pending_review' RETURNING *`,
    [id]
  );
  if (!rows[0]) throw conflict('This submission is no longer pending review');
  scheduleIndexing(id); // background: extract text + embedding
  await createNotification(
    sub.student_id,
    'published',
    'Your research paper is now live in the public Research Library.',
    '/dashboard'
  );
  return rows[0];
}

export async function requestRevision(id: string, comment: string) {
  if (!comment?.trim()) throw badRequest('A comment is required when requesting a revision');
  const sub = await getSubmissionOrThrow(id);
  if (sub.status !== 'pending_review') throw conflict('Only a pending submission can be returned for revision');
  const { rows } = await query(
    `UPDATE submissions SET status = 'revision_requested', review_comment = $2, updated_at = now()
       WHERE id = $1 AND status = 'pending_review' RETURNING *`,
    [id, comment.trim()]
  );
  if (!rows[0]) throw conflict('This submission is no longer pending review');
  await createNotification(
    sub.student_id,
    'revision_requested',
    'Revisions have been requested. Please check your submission for comments.',
    '/dashboard'
  );
  return rows[0];
}

export async function reject(id: string, comment?: string) {
  const sub = await getSubmissionOrThrow(id);
  if (sub.status !== 'pending_review') throw conflict('Only a pending submission can be rejected');
  const { rows } = await query(
    `UPDATE submissions SET status = 'rejected', review_comment = $2, updated_at = now()
       WHERE id = $1 AND status = 'pending_review' RETURNING *`,
    [id, comment?.trim() ?? null]
  );
  if (!rows[0]) throw conflict('This submission is no longer pending review');
  await createNotification(
    sub.student_id,
    'rejected',
    'Your submission has not been approved. Please see the comments for details.',
    '/dashboard'
  );
  return rows[0];
}

export async function unpublish(id: string) {
  const sub = await getSubmissionOrThrow(id);
  if (sub.status !== 'published') throw badRequest('Only a published paper can be unpublished');
  const { rows } = await query(
    `UPDATE submissions SET status = 'unpublished', updated_at = now()
       WHERE id = $1 AND status = 'published' RETURNING *`,
    [id]
  );
  if (!rows[0]) throw conflict('This paper is no longer published');
  await createNotification(
    sub.student_id,
    'unpublished',
    'Your paper has been removed from the library. Contact your Admin for details.',
    '/dashboard'
  );
  return rows[0];
}

export async function republish(id: string) {
  const sub = await getSubmissionOrThrow(id);
  if (sub.status !== 'unpublished') throw badRequest('Only an unpublished paper can be re-published');
  const { rows } = await query(
    `UPDATE submissions SET status = 'published', updated_at = now()
       WHERE id = $1 AND status = 'unpublished' RETURNING *`,
    [id]
  );
  if (!rows[0]) throw conflict('This paper is no longer unpublished');
  if (sub.index_status !== 'ready') scheduleIndexing(id);
  await createNotification(
    sub.student_id,
    'published',
    'Your research paper is now live in the public Research Library.',
    '/dashboard'
  );
  return rows[0];
}

export async function editPaper(
  id: string,
  input: { title?: string; abstract?: string; department?: string; session?: string; tags?: string[] }
) {
  const current = await getSubmissionOrThrow(id);
  if (!['published', 'unpublished'].includes(current.status)) {
    throw conflict('Only published or unpublished paper metadata can be edited');
  }
  const { rows } = await query(
    `UPDATE submissions SET
        title = COALESCE($2, title),
        abstract = COALESCE($3, abstract),
        department = COALESCE($4, department),
        session = COALESCE($5, session),
        tags = COALESCE($6, tags),
        updated_at = now()
      WHERE id = $1 AND status IN ('published', 'unpublished') RETURNING *`,
    [id, input.title ?? null, input.abstract ?? null, input.department ?? null, input.session ?? null, input.tags ?? null]
  );
  if (!rows[0]) throw conflict('Only published or unpublished paper metadata can be edited');
  // Refresh embedding to reflect edited metadata (tsvector auto-updates via generated column).
  if (rows[0].status === 'published' || rows[0].status === 'unpublished') scheduleIndexing(id);
  return rows[0];
}

export async function stats() {
  const [students, byStatus] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'`),
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int AS count FROM submissions GROUP BY status`
    ),
  ]);
  const counts: Record<string, number> = {
    draft: 0,
    pending_review: 0,
    revision_requested: 0,
    rejected: 0,
    published: 0,
    unpublished: 0,
  };
  for (const r of byStatus.rows) counts[r.status] = Number(r.count);
  const totalSubmissions = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    totalStudents: Number(students.rows[0]?.count ?? 0),
    totalSubmissions,
    published: counts.published,
    byStatus: counts,
  };
}
