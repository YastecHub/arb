import crypto from 'crypto';
import { query } from '../../db/pool';
import { storage } from '../../lib/storage';
import { badRequest, forbidden, notFound, conflict } from '../../utils/http';
import { notifyAllAdmins } from '../notifications/notifications.service';

const ACTIVE_STATUSES = ['draft', 'pending_review', 'revision_requested'];
const ACTIVE_SUBMISSION_LIMIT = 3;

export interface SubmissionInput {
  title: string;
  abstract: string;
  session?: string;
  tags?: string[];
}

async function getStudent(studentId: string) {
  const { rows } = await query<{ name: string; matric_number: string | null; department: string | null }>(
    `SELECT name, matric_number, department FROM users WHERE id = $1`,
    [studentId]
  );
  if (!rows[0]) throw notFound('Student not found');
  return rows[0];
}

export async function listMine(studentId: string) {
  const { rows } = await query(
    `SELECT id, title, abstract, department, session, tags, status, review_comment,
            (pdf_key IS NOT NULL) AS has_pdf, index_status, published_at, created_at, updated_at
       FROM submissions WHERE student_id = $1 ORDER BY updated_at DESC`,
    [studentId]
  );
  return rows;
}

async function getOwnRecord(studentId: string, id: string) {
  const { rows } = await query(`SELECT * FROM submissions WHERE id = $1 AND student_id = $2`, [id, studentId]);
  if (!rows[0]) throw notFound('Submission not found');
  return rows[0];
}

export async function getOwn(studentId: string, id: string) {
  const { rows } = await query(
    `SELECT id, title, abstract, author_name, matric_number, department, session, tags,
            status, review_comment, (pdf_key IS NOT NULL) AS has_pdf, index_status,
            published_at, created_at, updated_at
       FROM submissions WHERE id = $1 AND student_id = $2`,
    [id, studentId]
  );
  if (!rows[0]) throw notFound('Submission not found');
  return rows[0];
}

export async function downloadOwn(studentId: string, id: string): Promise<{ buffer: Buffer; filename: string }> {
  const { rows } = await query<{ pdf_key: string | null; title: string }>(
    `SELECT pdf_key, title FROM submissions WHERE id = $1 AND student_id = $2`,
    [id, studentId]
  );
  if (!rows[0] || !rows[0].pdf_key) throw notFound('Submission PDF not found');
  return {
    buffer: await storage.get(rows[0].pdf_key),
    filename: `${rows[0].title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.pdf`,
  };
}

async function storePdf(studentId: string, file: Express.Multer.File) {
  const key = `submissions/${studentId}/${crypto.randomUUID()}.pdf`;
  return storage.put(key, file.buffer, 'application/pdf');
}

async function addThreadEvent(input: {
  submissionId: string;
  actorId?: string | null;
  actorRole: 'student' | 'admin' | 'system';
  eventType: 'submitted' | 'revision_requested' | 'resubmitted' | 'approved' | 'rejected' | 'comment' | 'unpublished' | 'republished';
  body?: string | null;
  pdfKey?: string | null;
  pdfUrl?: string | null;
}) {
  await query(
    `INSERT INTO submission_thread_events
       (submission_id, actor_id, actor_role, event_type, body, pdf_key, pdf_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.submissionId,
      input.actorId ?? null,
      input.actorRole,
      input.eventType,
      input.body ?? null,
      input.pdfKey ?? null,
      input.pdfUrl ?? null,
    ]
  );
}

export async function listThread(studentId: string, id: string) {
  await getOwnRecord(studentId, id);
  const { rows } = await query(
    `SELECT e.id, e.submission_id, e.actor_id, e.actor_role, e.event_type, e.body,
            (e.pdf_key IS NOT NULL) AS has_pdf, e.created_at,
            u.name AS actor_name, u.email AS actor_email
       FROM submission_thread_events e
       LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.submission_id = $1
      ORDER BY e.created_at ASC`,
    [id]
  );
  return rows;
}

/** Create a new submission (draft or submitted). Enforces the one-active-submission rule. */
export async function create(
  studentId: string,
  input: SubmissionInput,
  file: Express.Multer.File | undefined,
  submit: boolean
) {
  const active = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM submissions WHERE student_id = $1 AND status = ANY($2)`,
    [studentId, ACTIVE_STATUSES]
  );
  if (Number(active.rows[0]?.count ?? 0) >= ACTIVE_SUBMISSION_LIMIT) {
    throw conflict(`You can only have ${ACTIVE_SUBMISSION_LIMIT} active submissions at a time.`);
  }
  if (submit && !file) throw badRequest('A PDF document is required to submit for review');
  if (submit && !input.abstract?.trim()) throw badRequest('An abstract is required to submit for review');
  if (submit && !input.session?.trim()) throw badRequest('An academic session is required to submit for review');

  const student = await getStudent(studentId);
  let pdf = { key: null as string | null, url: null as string | null };
  if (file) {
    const stored = await storePdf(studentId, file);
    pdf = { key: stored.key, url: stored.url };
  }

  const status = submit ? 'pending_review' : 'draft';
  let rows: { id: string }[];
  try {
    ({ rows } = await query<{ id: string }>(
      `INSERT INTO submissions
         (student_id, title, abstract, author_name, matric_number, department, session, tags, pdf_key, pdf_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        studentId,
        input.title.trim(),
        input.abstract?.trim() ?? '',
        student.name,
        student.matric_number,
        student.department,
        input.session ?? null,
        input.tags ?? [],
        pdf.key,
        pdf.url,
        status,
      ]
    ));
  } catch (err: any) {
    if (pdf.key) await storage.remove(pdf.key).catch(() => {});
    if (err?.code === '23505') {
      throw conflict(`You can only have ${ACTIVE_SUBMISSION_LIMIT} active submissions at a time.`);
    }
    throw err;
  }
  if (submit) {
    await addThreadEvent({
      submissionId: rows[0].id,
      actorId: studentId,
      actorRole: 'student',
      eventType: 'submitted',
      body: 'Paper submitted for review.',
      pdfKey: pdf.key,
      pdfUrl: pdf.url,
    });
    await notifyAllAdmins('submission_new', 'A new project has been submitted for review.', '/admin');
  }
  return getOwn(studentId, rows[0].id);
}

/** Update metadata / replace PDF. Allowed only while draft or revision_requested. */
export async function update(
  studentId: string,
  id: string,
  input: Partial<SubmissionInput>,
  file: Express.Multer.File | undefined
) {
  const current = await getOwnRecord(studentId, id);
  if (!['draft', 'revision_requested'].includes(current.status)) {
    throw forbidden('This submission can no longer be edited');
  }

  let pdfKey = current.pdf_key;
  let pdfUrl = current.pdf_url;
  let oldPdfKey: string | null = null;
  if (file) {
    const stored = await storePdf(studentId, file);
    oldPdfKey = current.pdf_key;
    pdfKey = stored.key;
    pdfUrl = stored.url;
  }

  const { rows } = await query<{ id: string }>(
    `UPDATE submissions SET
        title = COALESCE($3, title),
        abstract = COALESCE($4, abstract),
        session = COALESCE($5, session),
        tags = COALESCE($6, tags),
        pdf_key = $7, pdf_url = $8,
        full_text = CASE WHEN $9::boolean THEN '' ELSE full_text END,
        embedding = CASE WHEN $9::boolean THEN NULL ELSE embedding END,
        index_status = CASE WHEN $9::boolean THEN 'none' ELSE index_status END,
        updated_at = now()
      WHERE id = $1 AND student_id = $2 RETURNING id`,
    [
      id,
      studentId,
      input.title?.trim() ?? null,
      input.abstract?.trim() ?? null,
      input.session ?? null,
      input.tags ?? null,
      pdfKey,
      pdfUrl,
      Boolean(file),
    ]
  );
  if (oldPdfKey) await storage.remove(oldPdfKey).catch(() => {});
  return getOwn(studentId, rows[0].id);
}

/** Submit a draft, or resubmit after a revision request. Both move to pending_review. */
export async function submitForReview(studentId: string, id: string) {
  const current = await getOwnRecord(studentId, id);
  if (!['draft', 'revision_requested'].includes(current.status)) {
    throw badRequest('Only a draft or a revision-requested submission can be submitted');
  }
  if (!current.pdf_key) throw badRequest('Upload the project PDF before submitting');
  if (!current.abstract?.trim()) throw badRequest('Add an abstract before submitting');
  if (!current.session?.trim()) throw badRequest('Add an academic session before submitting');

  const { rows } = await query<{ id: string }>(
    `UPDATE submissions SET status = 'pending_review', updated_at = now()
       WHERE id = $1 AND student_id = $2 RETURNING id`,
    [id, studentId]
  );
  await addThreadEvent({
    submissionId: id,
    actorId: studentId,
    actorRole: 'student',
    eventType: current.status === 'revision_requested' ? 'resubmitted' : 'submitted',
    body: current.status === 'revision_requested' ? 'Revised paper submitted for review.' : 'Paper submitted for review.',
    pdfKey: current.pdf_key,
    pdfUrl: current.pdf_url,
  });
  await notifyAllAdmins('submission_new', 'A new project has been submitted for review.', '/admin');
  return getOwn(studentId, rows[0].id);
}

export async function resubmitRevision(
  studentId: string,
  id: string,
  note: string | undefined,
  file: Express.Multer.File | undefined
) {
  const current = await getOwnRecord(studentId, id);
  if (current.status !== 'revision_requested') {
    throw badRequest('Only a revision-requested submission can be resubmitted here');
  }
  if (!file && !current.pdf_key) throw badRequest('Upload the revised project PDF before resubmitting');

  let pdfKey = current.pdf_key;
  let pdfUrl = current.pdf_url;
  let oldPdfKey: string | null = null;
  if (file) {
    const stored = await storePdf(studentId, file);
    oldPdfKey = current.pdf_key;
    pdfKey = stored.key;
    pdfUrl = stored.url;
  }

  const { rows } = await query<{ id: string }>(
    `UPDATE submissions SET
        status = 'pending_review',
        pdf_key = $3,
        pdf_url = $4,
        full_text = CASE WHEN $5::boolean THEN '' ELSE full_text END,
        embedding = CASE WHEN $5::boolean THEN NULL ELSE embedding END,
        index_status = CASE WHEN $5::boolean THEN 'none' ELSE index_status END,
        updated_at = now()
      WHERE id = $1 AND student_id = $2 AND status = 'revision_requested'
      RETURNING id`,
    [id, studentId, pdfKey, pdfUrl, Boolean(file)]
  );
  if (!rows[0]) throw conflict('This submission is no longer awaiting revision');
  if (oldPdfKey) await storage.remove(oldPdfKey).catch(() => {});
  await addThreadEvent({
    submissionId: id,
    actorId: studentId,
    actorRole: 'student',
    eventType: 'resubmitted',
    body: note?.trim() || 'Revised paper submitted for review.',
    pdfKey,
    pdfUrl,
  });
  await notifyAllAdmins('submission_new', 'A revised paper has been resubmitted for review.', `/admin/submissions/${id}`);
  return getOwn(studentId, id);
}
