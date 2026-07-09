import { Pool, QueryResultRow } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Supabase / most hosted PG need SSL; local docker does not.
  ssl: env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PG pool error', err);
});
