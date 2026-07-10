import crypto from 'crypto';
import { env } from '../config/env';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'using',
  'with',
]);

function tokensFor(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 1200);
}

function hashFeature(feature: string): { index: number; sign: 1 | -1 } {
  const digest = crypto.createHash('sha256').update(`${env.embedding.model}:${feature}`).digest();
  const raw = digest.readUInt32BE(0);
  return { index: raw % env.embedding.dim, sign: digest[4] % 2 === 0 ? 1 : -1 };
}

function addFeature(vector: number[], feature: string, weight: number) {
  const { index, sign } = hashFeature(feature);
  vector[index] += sign * weight;
}

/** Embed a single text into a normalized vector without a server-side ML bundle. */
export async function embed(text: string): Promise<number[]> {
  const vector = Array.from({ length: env.embedding.dim }, () => 0);
  const tokens = tokensFor(text.replace(/\s+/g, ' ').trim().slice(0, 8000));

  for (let i = 0; i < tokens.length; i++) {
    addFeature(vector, tokens[i], 1);
    if (i + 1 < tokens.length) addFeature(vector, `${tokens[i]} ${tokens[i + 1]}`, 1.4);
    if (i + 2 < tokens.length) addFeature(vector, `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`, 1.8);
  }

  let magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    addFeature(vector, 'empty', 1);
    magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }
  return vector.map((value) => value / magnitude);
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
  void embed('warmup');
}
