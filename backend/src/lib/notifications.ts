import { pool } from '../db/client';

export type NotificationType =
  | 'event_reminder'
  | 'registration_confirmed'
  | 'new_reply'
  | 'upvote_received'
  | 'report_reviewed'
  | 'system_announcement'
  | 'mention';

// registration_confirmed is transactional — email always delivers regardless of user prefs
const TRANSACTIONAL = new Set<NotificationType>(['registration_confirmed']);

// Email enabled by default when user first turns on email_notifications
const SENSIBLE_EMAIL = new Set<NotificationType>(['mention', 'event_reminder', 'system_announcement']);

async function getNotifPref(
  userId: string,
  type: NotificationType,
): Promise<{ inApp: boolean; email: boolean }> {
  const isTransactional = TRANSACTIONAL.has(type);
  try {
    const r = await pool.query(
      'SELECT email_enabled, inapp, email FROM users.notification_preferences WHERE user_id = $1',
      [userId]
    );
    if (!r.rows.length) {
      // No row = defaults: in_app all ON, email only for sensible types + transactional
      return { inApp: true, email: isTransactional || SENSIBLE_EMAIL.has(type) };
    }
    const { email_enabled, inapp, email: emailPrefs } = r.rows[0];
    const inAppEnabled = inapp?.[type] !== false;
    const emailEnabled = isTransactional || (email_enabled === true && emailPrefs?.[type] === true);
    return { inApp: inAppEnabled, email: emailEnabled };
  } catch {
    return { inApp: true, email: isTransactional };
  }
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<{ email: boolean }> {
  const pref = await getNotifPref(userId, type);

  if (pref.inApp) {
    try {
      await pool.query(
        `INSERT INTO notifications.notifications (user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, title, message, actionUrl ?? null]
      );
    } catch (err: any) {
      console.error('[notifications] createNotification error:', err.message);
    }
  }

  return { email: pref.email };
}

export async function createBulkNotification({
  userIds,
  type,
  title,
  message,
  actionUrl,
}: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  if (!userIds.length) return;

  // Check per-user in_app prefs — fall back to all users if the table isn't ready yet
  let inAppUsers = userIds;
  try {
    const prefsResult = await pool.query(
      `SELECT user_id, COALESCE((inapp->>'${type}')::boolean, true) AS type_on
       FROM users.notification_preferences
       WHERE user_id = ANY($1::UUID[])`,
      [userIds]
    );
    const prefMap = new Map<string, boolean>(
      prefsResult.rows.map((r: any) => [r.user_id, r.type_on !== false])
    );
    inAppUsers = userIds.filter(id => prefMap.get(id) ?? true);
  } catch {
    // preferences table not yet created — send to all users (safe default)
  }

  if (!inAppUsers.length) return;

  try {
    const placeholders = inAppUsers
      .map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`)
      .join(', ');
    const params = inAppUsers.flatMap(uid => [uid, type, title, message, actionUrl ?? null]);
    await pool.query(
      `INSERT INTO notifications.notifications (user_id, type, title, message, action_url) VALUES ${placeholders}`,
      params
    );
  } catch (err: any) {
    console.error('[notifications] createBulkNotification error:', err.message);
  }
}
