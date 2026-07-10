import { query } from '../../db/pool';
import { env } from '../../config/env';
import {
  hashPassword,
  verifyPassword,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../../utils/auth';
import { badRequest, conflict, unauthorized, notFound, forbidden } from '../../utils/http';
import { sendEmail, resetEmail } from '../../lib/email';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  department: string | null;
  matric_number: string | null;
  is_verified: boolean;
}

const publicCols =
  'id, name, email, role, department, matric_number, is_verified';

function tokensFor(u: { id: string; role: 'student' | 'admin'; email: string }) {
  const payload: JwtPayload = { sub: u.id, role: u.role, email: u.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  department: string;
  matricNumber: string;
}): Promise<{ user: PublicUser }> {
  const email = input.email.toLowerCase().trim();
  const domain = email.split('@')[1];
  if (domain !== env.allowedEmailDomain) {
    throw badRequest(`Registration is restricted to @${env.allowedEmailDomain} email addresses`);
  }

  const matricNumber = input.matricNumber.trim();
  const existing = await query<{ email: string; matric_number: string | null }>(
    `SELECT email, matric_number FROM users
      WHERE email = $1 OR lower(matric_number) = lower($2)
      LIMIT 1`,
    [email, matricNumber]
  );
  if (existing.rows[0]?.email === email) throw conflict('An account with this email already exists');
  if (existing.rows[0]) throw conflict('An account with this matric number already exists');

  const passwordHash = await hashPassword(input.password);

  let rows: PublicUser[];
  try {
    ({ rows } = await query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, role, department, matric_number, is_verified, verification_token)
       VALUES ($1, $2, $3, 'student', $4, $5, TRUE, NULL)
       RETURNING ${publicCols}`,
      [input.name.trim(), email, passwordHash, input.department, matricNumber]
    ));
  } catch (err: any) {
    if (err?.code === '23505') throw conflict('An account with this email or matric number already exists');
    throw err;
  }

  return { user: rows[0] };
}

export async function login(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase().trim();
  const { rows } = await query<any>(
    `SELECT ${publicCols}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw unauthorized('Invalid email or password');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw unauthorized('Invalid email or password');
  if (!user.is_verified) throw unauthorized('Please verify your email before logging in');

  const { password_hash, ...publicUser } = user;
  return { user: publicUser as PublicUser, ...tokensFor(user) };
}

export function refresh(refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }
  return tokensFor({ id: payload.sub, role: payload.role, email: payload.email });
}

export async function me(userId: string): Promise<PublicUser> {
  const { rows } = await query<PublicUser>(`SELECT ${publicCols} FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw notFound('User not found');
  return rows[0];
}

export async function requestPasswordReset(emailRaw: string): Promise<void> {
  if (!env.email.passwordResetEnabled || !env.email.resendApiKey) {
    throw forbidden('Password reset is currently unavailable. Please contact an ARB administrator.');
  }
  const email = emailRaw.toLowerCase().trim();
  const token = randomToken();
  const { rows } = await query<{ name: string }>(
    `UPDATE users SET reset_token = $1, reset_expires = now() + interval '1 hour'
       WHERE email = $2 RETURNING name`,
    [token, email]
  );
  // Always return success (don't leak which emails exist).
  if (!rows[0]) return;
  const link = `${env.frontendUrl}/reset-password?token=${token}`;
  await sendEmail({ to: email, subject: 'Reset your ARB ResearchHub password', html: resetEmail(rows[0].name, link) });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  const { rowCount } = await query(
    `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL
       WHERE reset_token = $2 AND reset_expires > now() RETURNING id`,
    [passwordHash, token]
  );
  if (!rowCount) throw badRequest('This reset link is invalid or has expired');
}
