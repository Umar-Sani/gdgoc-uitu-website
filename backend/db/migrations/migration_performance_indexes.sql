-- Performance indexes — run once in Supabase SQL editor
-- Addresses the three missing indexes documented in Performance.md

-- Unread notification queries filter on (user_id, is_read, created_at).
-- The partial index (WHERE is_read = FALSE) keeps it small and targeted.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications.notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;

-- Notification preference lookups join on user_id in every mention/reply flow.
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user
  ON users.notification_preferences (user_id);

-- Newsletter active-subscriber queries filter on is_active = TRUE.
CREATE INDEX IF NOT EXISTS idx_newsletter_active
  ON content.newsletter_subscribers (email)
  WHERE is_active = TRUE;
