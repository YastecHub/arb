import { query } from '../db/pool';
import { storage } from './storage';
import { extractPdfText } from './pdf';
import { embed } from './embeddings';

// Runs in the background when a paper is published (PRD 4.4.3 / NFR "Search Performance"):
// extract full text -> tsvector (generated column) + generate embedding for pgvector.
// Keeps the Admin's approve action responsive.
export async function indexSubmission(submissionId: string): Promise<void> {
  try {
    await query(`UPDATE submissions SET index_status = 'processing' WHERE id = $1`, [submissionId]);

    const { rows } = await query<{ pdf_key: string | null; title: string; abstract: string; full_text: string }>(
      `SELECT pdf_key, title, abstract, full_text FROM submissions WHERE id = $1`,
      [submissionId]
    );
    const sub = rows[0];
    if (!sub) return;

    // Extract text once (idempotent: reuse if already extracted).
    let fullText = sub.full_text;
    if (!fullText && sub.pdf_key) {
      const buf = await storage.get(sub.pdf_key);
      fullText = await extractPdfText(buf);
      await query(`UPDATE submissions SET full_text = $1 WHERE id = $2`, [fullText, submissionId]);
    }

    // Embed title + abstract + a slice of body for semantic recall.
    const embedInput = `${sub.title}\n\n${sub.abstract}\n\n${fullText}`.slice(0, 8000);
    const vector = await embed(embedInput);
    await query(`UPDATE submissions SET embedding = $1, index_status = 'ready' WHERE id = $2`, [
      vector,
      submissionId,
    ]);
    // eslint-disable-next-line no-console
    console.log(`🔎 Indexed submission ${submissionId} (${fullText.length} chars extracted).`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Indexing failed for ${submissionId}:`, (err as Error).message);
    await query(`UPDATE submissions SET index_status = 'error' WHERE id = $1`, [submissionId]).catch(() => {});
  }
}

// Fire-and-forget scheduler (in-process background job).
export function scheduleIndexing(submissionId: string): void {
  setImmediate(() => {
    indexSubmission(submissionId).catch(() => {});
  });
}
