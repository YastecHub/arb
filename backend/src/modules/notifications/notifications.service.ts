import { query } from '../../db/pool';

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  link?: string
) {
  await query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)`,
    [userId, type, message, link ?? null]
  );
}

export async function notifyAllAdmins(type: string, message: string, link?: string) {
  const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'admin'`);
  await Promise.all(rows.map((r) => createNotification(r.id, type, message, link)));
}

export async function listNotifications(userId: string) {
  const { rows } = await query(
    `SELECT id, type, message, link, is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function unreadCount(userId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markAllRead(userId: string) {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
}

export async function markRead(userId: string, id: string) {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = $2`, [userId, id]);
}
