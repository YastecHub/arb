import { pool, query } from './pool';
import { env } from '../config/env';
import { hashPassword } from '../utils/auth';

async function main() {
  const email = env.seedAdmin.email.toLowerCase().trim();
  const passwordHash = await hashPassword(env.seedAdmin.password);

  await query(
    `INSERT INTO users (name, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       is_verified = TRUE,
       verification_token = NULL`,
    [env.seedAdmin.name, email, passwordHash]
  );

  console.log(`Admin account ready: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Admin bootstrap failed:', err);
  process.exit(1);
});
