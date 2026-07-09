import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Running migrations...');
  await pool.query(sql);
  console.log('✅ Schema applied.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
