import crypto from 'crypto';
import { query } from '../../db/pool';
import { storage } from '../../lib/storage';
import { badRequest, forbidden, notFound, conflict } from '../../utils/http';
import { notifyAllAdmins } from '../notifications/notifications.service';

const ACTIVE_STATUSES = ['draft', 'pending_review', 'revision_requested'];

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
            pdf_url, index_status, published_at, created_at, updated_at
       FROM submissions WHERE student_id = $1 ORDER BY updated_at DESC`,
    [studentId]
  );
  return rows;
}

export async function getOwn(studentId: string, id: string) {
  const { rows } = await query(`SELECT * FROM submissions WHERE id = $1 AND student_id = $2`, [id, studentId]);
  if (!rows[0]) throw notFound('Submission not found');
  return rows[0];
}

async function storePdf(studentId: string, file: Express.Multer.File) {
  const key = `submissions/${studentId}/${crypto.randomUUID()}.pdf`;
  return storage.put(key, file.buffer, 'application/pdf');
}

/** Create a new submission (draft or submitted). Enforces the one-active-submission rule. */
export async function create(
  studentId: string,
  input: SubmissionInput,
  file: Express.Multer.File | undefined,
  submit: boolean
) {
  const active = await query(
    `SELECT id FROM submissions WHERE student_id = $1 AND status = ANY($2)`,
    [studentId, ACTIVE_STATUSES]
  );
  if (active.rowCount) {
    throw conflict('You already have an active submission. Edit or withdraw it before starting a new one.');
  }
  if (submit && !file) throw badRequest('A PDF document is required to submit for review');

  const student = await getStudent(studentId);
  let pdf = { key: null as string | null, url: null as string | null };
  if (file) {
    const stored = await storePdf(studentId, file);
    pdf = { key: stored.key, url: stored.url };
  }

  const status = submit ? 'pending_review' : 'draft';
  const { rows } = await query(
    `INSERT INTO submissions
       (student_id, title, abstract, author_name, matric_number, department, session, tags, pdf_key, pdf_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
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
  );
  if (submit) await notifyAllAdmins('submission_new', 'A new project has been submitted for review.', '/admin');
  return rows[0];
}

/** Update metadata / replace PDF. Allowed only while draft or revision_requested. */
export async function update(
  studentId: string,
  id: string,
  input: Partial<SubmissionInput>,
  file: Express.Multer.File | undefined
) {
  const current = await getOwn(studentId, id);
  if (!['draft', 'revision_requested'].includes(current.status)) {
    throw forbidden('This submission can no longer be edited');
  }

  let pdfKey = current.pdf_key;
  let pdfUrl = current.pdf_url;
  if (file) {
    if (current.pdf_key) await storage.remove(current.pdf_key).catch(() => {});
    const stored = await storePdf(studentId, file);
    pdfKey = stored.key;
    pdfUrl = stored.url;
  }

  const { rows } = await query(
    `UPDATE submissions SET
        title = COALESCE($3, title),
        abstract = COALESCE($4, abstract),
        session = COALESCE($5, session),
        tags = COALESCE($6, tags),
        pdf_key = $7, pdf_url = $8,
        updated_at = now()
      WHERE id = $1 AND student_id = $2 RETURNING *`,
    [
      id,
      studentId,
      input.title?.trim() ?? null,
      input.abstract?.trim() ?? null,
      input.session ?? null,
      input.tags ?? null,
      pdfKey,
      pdfUrl,
    ]
  );
  return rows[0];
}

/** Submit a draft, or resubmit after a revision request. Both move to pending_review. */
export async function submitForReview(studentId: string, id: string) {
  const current = await getOwn(studentId, id);
  if (!['draft', 'revision_requested'].includes(current.status)) {
    throw badRequest('Only a draft or a revision-requested submission can be submitted');
  }
  if (!current.pdf_key) throw badRequest('Upload the project PDF before submitting');

  const { rows } = await query(
    `UPDATE submissions SET status = 'pending_review', updated_at = now()
       WHERE id = $1 AND student_id = $2 RETURNING *`,
    [id, studentId]
  );
  await notifyAllAdmins('submission_new', 'A new project has been submitted for review.', '/admin');
  return rows[0];
}
