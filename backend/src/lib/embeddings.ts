import { env } from '../config/env';

// Local sentence-embedding model (MiniLM, 384-dim). Runs in-process — no API key,
// no external service. Produces the vectors that Groq cannot (Groq serves LLMs only),
// which we store in pgvector for semantic recall.
let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      // @xenova/transformers is ESM-only; load via dynamic import from CommonJS.
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', env.embedding.model);
    })();
  }
  return extractorPromise;
}

/** Embed a single text into a normalized 384-dim vector. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 8000);
  const output = await extractor(clean || ' ', { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Cosine similarity between two vectors (embeddings are already L2-normalized). */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // normalized vectors -> dot product == cosine similarity
}

/** Warm the model at boot so the first search isn't slow. */
export function warmEmbeddings(): void {
  embed('warmup').catch(() => {
    /* ignore — model downloads lazily on first real use */
  });
}
