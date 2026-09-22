-- ============================================================
-- GDGOC-UITU Advanced Community Platform
-- Full Database Schema — PostgreSQL 15
-- Version: 1.3 | Date: 2026-06-14
-- Authors: Umar Sani, Umair Jan, Daniyal Noor, Saad Mehmood
-- Course: Database Systems — UIT University, Karachi
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram similarity for search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- composite GIN index support
CREATE EXTENSION IF NOT EXISTS "pg_cron";    -- scheduled jobs (if available)

-- ============================================================
-- SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS forum;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS ai_metadata;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS notifications;

-- ============================================================
-- CUSTOM ENUM TYPES
-- ============================================================

CREATE TYPE users.role_name_enum AS ENUM (
    'super_admin',
    'admin',
    'editor',
    'viewer',
    'user'
);

CREATE TYPE events.event_type_enum AS ENUM (
    'workshop',
    'seminar',
    'hackathon',
    'session',
    'social'
);

CREATE TYPE events.event_status_enum AS ENUM (
    'draft',
    'published',
    'ongoing',
    'completed',
    'cancelled'
);

CREATE TYPE events.payment_status_enum AS ENUM (
    'pending',
    'completed',
    'refunded',
    'failed'
);

CREATE TYPE payments.transaction_status_enum AS ENUM (
    'pending',
    'success',
    'failed',
    'refunded'
);

CREATE TYPE payments.gateway_enum AS ENUM (
    'stripe',
    'manual',
    'simulated'
);

CREATE TYPE social.platform_enum AS ENUM (
    'instagram',
    'twitter',
    'linkedin',
    'facebook'
);

CREATE TYPE social.post_status_enum AS ENUM (
    'draft',
    'scheduled',
    'posted'
);

CREATE TYPE audit.operation_enum AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);

CREATE TYPE content.sponsor_tier_enum AS ENUM (
    'platinum',
    'gold',
    'silver',
    'bronze',
    'community_partner'
);

CREATE TYPE content.team_section_enum AS ENUM (
    'gdg_lead',
    'co_lead',
    'member',
    'mentor',
    'past_leader'
);

CREATE TYPE notifications.notification_type_enum AS ENUM (
    'event_reminder',
    'registration_confirmed',
    'new_reply',
    'upvote_received',
    'report_reviewed',
    'system_announcement',
    'mention'
);

-- ============================================================
-- SCHEMA: users
-- ============================================================

-- users.roles
CREATE TABLE users.roles (
    role_id     SERIAL          PRIMARY KEY,
    role_name   VARCHAR(50)     NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users.roles IS 'Defines the five access roles available in the platform.';
COMMENT ON COLUMN users.roles.role_name IS 'Unique role identifier: super_admin, admin, editor, viewer, user.';

-- Seed roles
INSERT INTO users.roles (role_name, description) VALUES
    ('super_admin', 'Full system access — all modules, configs, audit, AI settings.'),
    ('admin',       'Manage events, forum moderation, payments, assign sub-roles.'),
    ('editor',      'Create/publish events, social posts, CMS editing. No user management.'),
    ('viewer',      'Read-only access to analytics and dashboards. No write permissions.'),
    ('user',        'General community member: register for events, post on forum, manage own profile.');

-- users.permissions
CREATE TABLE users.permissions (
    permission_id   SERIAL          PRIMARY KEY,
    permission_name VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT
);

COMMENT ON TABLE users.permissions IS 'Granular permission keys checked by API middleware.';

-- Seed permissions
INSERT INTO users.permissions (permission_name, description) VALUES
    ('user.manage',     'Create, deactivate, and modify any user account.'),
    ('role.assign',     'Assign or change roles for other users.'),
    ('event.create',    'Create and edit events.'),
    ('event.delete',    'Hard-delete or permanently remove events.'),
    ('event.register',  'Register for events (self or others).'),
    ('payment.manage',  'Process and refund payments.'),
    ('payment.view',    'View payment transactions and reports.'),
    ('forum.create',    'Create threads and replies in the forum.'),
    ('forum.moderate',  'Lock, pin, remove, or restore forum content.'),
    ('social.post',     'Create and schedule social media posts.'),
    ('cms.edit',        'Update dynamic website sections via CMS.'),
    ('analytics.view',  'Access event and platform analytics dashboards.'),
    ('audit.view',      'View the immutable audit log.'),
    ('ai.config',       'Configure AI recommendation engine settings.');

-- users.role_permissions (junction)
CREATE TABLE users.role_permissions (
    role_id         INTEGER     NOT NULL REFERENCES users.roles(role_id) ON DELETE CASCADE,
    permission_id   INTEGER     NOT NULL REFERENCES users.permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE users.role_permissions IS 'Many-to-many junction between roles and permissions.';

-- Seed role_permissions
DO $$
DECLARE
    v_super_admin_id    INTEGER;
    v_admin_id          INTEGER;
    v_editor_id         INTEGER;
    v_viewer_id         INTEGER;
BEGIN
    SELECT role_id INTO v_super_admin_id FROM users.roles WHERE role_name = 'super_admin';
    SELECT role_id INTO v_admin_id       FROM users.roles WHERE role_name = 'admin';
    SELECT role_id INTO v_editor_id      FROM users.roles WHERE role_name = 'editor';
    SELECT role_id INTO v_viewer_id      FROM users.roles WHERE role_name = 'viewer';

    -- super_admin gets ALL permissions
    INSERT INTO users.role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, permission_id FROM users.permissions;

    -- admin permissions
    INSERT INTO users.role_permissions (role_id, permission_id)
    SELECT v_admin_id, permission_id FROM users.permissions
    WHERE permission_name IN (
        'role.assign','event.create','event.register','payment.manage',
        'payment.view','forum.create','forum.moderate','social.post',
        'cms.edit','analytics.view'
    );

    -- editor permissions
    INSERT INTO users.role_permissions (role_id, permission_id)
    SELECT v_editor_id, permission_id FROM users.permissions
    WHERE permission_name IN ('event.create','event.register','forum.create','social.post','cms.edit');

    -- viewer permissions
    INSERT INTO users.role_permissions (role_id, permission_id)
    SELECT v_viewer_id, permission_id FROM users.permissions
    WHERE permission_name IN ('payment.view','analytics.view');
END;
$$;

-- users.users
CREATE TABLE users.users (
    user_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(512)    NOT NULL,
    full_name       VARCHAR(200)    NOT NULL,
    username        VARCHAR(100)    UNIQUE,
    role_id         INTEGER         NOT NULL REFERENCES users.roles(role_id) ON DELETE RESTRICT,
    avatar_url      TEXT,
    bio             TEXT,
    skill_tags      TEXT[]          DEFAULT '{}',
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_login      TIMESTAMPTZ
);

COMMENT ON TABLE  users.users IS 'Core member table. Soft-delete via is_active flag.';
COMMENT ON COLUMN users.users.skill_tags IS 'PostgreSQL TEXT[] array of technology interests used by the AI recommendation engine. GIN-indexed.';
COMMENT ON COLUMN users.users.is_verified IS 'Set to TRUE only after email verification link is clicked.';

-- users.password_reset_tokens
CREATE TABLE users.password_reset_tokens (
    token_id    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL REFERENCES users.users(user_id) ON DELETE CASCADE,
    token_hash  VARCHAR(512)    NOT NULL,
    expires_at  TIMESTAMPTZ     NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users.password_reset_tokens IS 'Short-lived tokens for the password reset flow. Invalidated after first use.';

-- users.notification_preferences
CREATE TABLE users.notification_preferences (
    user_id       UUID        PRIMARY KEY REFERENCES users.users(user_id) ON DELETE CASCADE,
    -- Master toggle: gates all email delivery except transactional types
    email_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    -- Per-type in-app toggles (JSONB key = NotificationType, value = boolean)
    inapp         JSONB       NOT NULL DEFAULT '{"new_reply":true,"mention":true,"upvote_received":true,"event_reminder":true,"registration_confirmed":true,"report_reviewed":true,"system_announcement":true}'::jsonb,
    -- Per-type email toggles — sensible defaults; registration_confirmed omitted (always on = transactional)
    email         JSONB       NOT NULL DEFAULT '{"mention":true,"event_reminder":true,"system_announcement":true,"new_reply":false,"upvote_received":false,"report_reviewed":false}'::jsonb,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users.notification_preferences IS 'Per-user notification preferences stored as JSONB. email_enabled is the master email gate; transactional emails (registration_confirmed) bypass it. Row created on first save — absence means all in-app ON, email only for sensible defaults.';

-- ============================================================
-- SCHEMA: events
-- ============================================================

-- events.categories
CREATE TABLE events.categories (
    category_id     SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    icon_url        TEXT,
    color_hex       CHAR(6),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE events.categories IS 'Reference table for event categories only. Forum threads use forum.categories for their own independent category set.';

INSERT INTO events.categories (name, description, color_hex) VALUES
    ('Flutter',     'Cross-platform mobile development with Flutter & Dart.',   '54C5F8'),
    ('AI/ML',       'Artificial Intelligence, Machine Learning, LLMs.',         'FF7043'),
    ('Web',         'Frontend, backend, and full-stack web development.',        '42A5F5'),
    ('Cloud',       'Cloud platforms: GCP, AWS, Azure, DevOps.',                '26A69A'),
    ('Android',     'Native Android development with Kotlin/Java.',             '66BB6A'),
    ('Open Source', 'Open source contribution and community projects.',         'AB47BC'),
    ('General',     'General GDGOC community events and socials.',              '78909C');

-- events.events
CREATE TABLE events.events (
    event_id            UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(300)                    NOT NULL,
    description         TEXT,
    event_type          events.event_type_enum          NOT NULL,
    category_id         INTEGER                         REFERENCES events.categories(category_id) ON DELETE SET NULL,
    start_datetime      TIMESTAMPTZ                     NOT NULL,
    end_datetime        TIMESTAMPTZ                     NOT NULL,
    venue               VARCHAR(300),
    is_online           BOOLEAN                         NOT NULL DEFAULT FALSE,
    meeting_link        TEXT,
    max_seats           INTEGER                         NOT NULL CHECK (max_seats > 0),
    seats_registered    INTEGER                         NOT NULL DEFAULT 0 CHECK (seats_registered >= 0),
    is_free             BOOLEAN                         NOT NULL DEFAULT TRUE,
    ticket_price        NUMERIC(10,2)                   CHECK (is_free = TRUE OR ticket_price > 0),
    banner_url          TEXT,
    tags                TEXT[]                          DEFAULT '{}',
    status              events.event_status_enum        NOT NULL DEFAULT 'draft',
    created_by          UUID                            REFERENCES users.users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_end_after_start     CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_online_link         CHECK (is_online = FALSE OR meeting_link IS NOT NULL)
);

COMMENT ON TABLE  events.events IS 'Central event table. seats_registered is a denormalised counter maintained by trigger for read performance.';
COMMENT ON COLUMN events.events.seats_registered IS 'Denormalised. Atomically maintained by seat_counter_trigger. Never update directly.';
COMMENT ON COLUMN events.events.tags             IS 'GIN-indexed TEXT[] for AI overlap matching and event filtering.';

-- events.registrations
CREATE TABLE events.registrations (
    registration_id     UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID                            NOT NULL REFERENCES events.events(event_id) ON DELETE RESTRICT,
    user_id             UUID                            NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    registered_at       TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    payment_status      events.payment_status_enum      NOT NULL DEFAULT 'pending',
    transaction_id      UUID,                           -- FK added after payments.transactions is created
    attendance_confirmed BOOLEAN                        NOT NULL DEFAULT FALSE,
    UNIQUE (event_id, user_id)
);

COMMENT ON TABLE  events.registrations IS 'One record per user per event. UNIQUE(event_id, user_id) prevents duplicate enrollment at DB level.';
COMMENT ON COLUMN events.registrations.transaction_id IS 'NULL for free events. FK to payments.transactions added after that table is created.';

-- events.event_people is defined in the content schema section below (it FKs
-- to content.people, which must exist first).

-- ============================================================
-- SCHEMA: payments
-- ============================================================

-- payments.transactions
CREATE TABLE payments.transactions (
    transaction_id      UUID                                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID                                NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    event_id            UUID                                NOT NULL REFERENCES events.events(event_id) ON DELETE RESTRICT,
    amount              NUMERIC(10,2)                       NOT NULL CHECK (amount > 0),
    currency            CHAR(3)                             NOT NULL DEFAULT 'PKR',
    gateway             payments.gateway_enum               NOT NULL,
    gateway_reference   VARCHAR(200)                        UNIQUE,
    status              payments.transaction_status_enum    NOT NULL DEFAULT 'pending',
    payment_method      VARCHAR(100),
    invoice_number      VARCHAR(50)                         UNIQUE,
    initiated_at        TIMESTAMPTZ                         NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    metadata            JSONB,
    updated_at          TIMESTAMPTZ                         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  payments.transactions IS 'One transaction per paid registration attempt. gateway_reference UNIQUE enforces idempotency.';
COMMENT ON COLUMN payments.transactions.metadata          IS 'Raw gateway response stored as JSONB. Avoids schema migration as gateway formats evolve.';
COMMENT ON COLUMN payments.transactions.gateway_reference IS 'External payment ID from Stripe or simulated gateway. UNIQUE prevents duplicate charge processing.';
COMMENT ON COLUMN payments.transactions.invoice_number    IS 'Generated on payment success by process_payment stored procedure via sequence.';

-- Invoice number sequence
CREATE SEQUENCE payments.invoice_seq START 1 INCREMENT 1;

-- Add FK from registrations to transactions (now that transactions table exists)
ALTER TABLE events.registrations
    ADD CONSTRAINT fk_registrations_transaction
    FOREIGN KEY (transaction_id) REFERENCES payments.transactions(transaction_id) ON DELETE SET NULL;

-- ============================================================
-- SCHEMA: forum
-- ============================================================

-- forum.categories
CREATE TABLE forum.categories (
    category_id     SERIAL          PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL UNIQUE,
    description     TEXT,
    icon_url        TEXT,
    color_hex       CHAR(6),
    display_order   INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE forum.categories IS 'Forum-specific discussion categories. Separate from events.categories to allow independent management of forum topics.';

-- forum.threads
CREATE TABLE forum.threads (
    thread_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(400)    NOT NULL,
    body            TEXT            NOT NULL,
    category_id     INTEGER         REFERENCES forum.categories(category_id) ON DELETE SET NULL,
    author_id       UUID            NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    is_pinned       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_locked       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN         NOT NULL DEFAULT FALSE,
    view_count      INTEGER         NOT NULL DEFAULT 0,
    upvote_count    INTEGER         NOT NULL DEFAULT 0,
    reply_count     INTEGER         NOT NULL DEFAULT 0,
    tags            TEXT[]          DEFAULT '{}',
    tsv             TSVECTOR,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  forum.threads IS 'Forum discussion threads. reply_count and upvote_count are trigger-maintained counters.';
COMMENT ON COLUMN forum.threads.tsv        IS 'GIN-indexed full-text search vector. Populated by BEFORE INSERT/UPDATE trigger.';
COMMENT ON COLUMN forum.threads.is_deleted IS 'Soft delete flag. Hard delete is reserved for admin override.';

-- forum.replies
CREATE TABLE forum.replies (
    reply_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id           UUID        NOT NULL REFERENCES forum.threads(thread_id) ON DELETE CASCADE,
    parent_reply_id     UUID        REFERENCES forum.replies(reply_id) ON DELETE CASCADE,
    author_id           UUID        NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    body                TEXT        NOT NULL,
    upvote_count        INTEGER     NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  forum.replies IS 'Nested reply system. parent_reply_id NULL = top-level reply. Self-referential FK for nested threading.';
COMMENT ON COLUMN forum.replies.parent_reply_id IS 'NULL for direct thread replies. References forum.replies for nested sub-replies.';

-- forum.upvotes
CREATE TABLE forum.upvotes (
    upvote_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users.users(user_id) ON DELETE CASCADE,
    thread_id       UUID        REFERENCES forum.threads(thread_id) ON DELETE CASCADE,
    reply_id        UUID        REFERENCES forum.replies(reply_id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_upvote_target CHECK (
        (thread_id IS NOT NULL AND reply_id IS NULL) OR
        (thread_id IS NULL AND reply_id IS NOT NULL)
    ),
    UNIQUE (user_id, thread_id),
    UNIQUE (user_id, reply_id)
);

COMMENT ON TABLE forum.upvotes IS 'Tracks upvotes on threads and replies. UNIQUE constraints prevent double-upvoting. Trigger maintains upvote_count on parent.';

-- forum.reports
CREATE TABLE forum.reports (
    report_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID        NOT NULL REFERENCES users.users(user_id) ON DELETE CASCADE,
    thread_id       UUID        REFERENCES forum.threads(thread_id) ON DELETE CASCADE,
    reply_id        UUID        REFERENCES forum.replies(reply_id) ON DELETE CASCADE,
    reason          TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
    reviewed_by     UUID        REFERENCES users.users(user_id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_report_target CHECK (
        (thread_id IS NOT NULL AND reply_id IS NULL) OR
        (thread_id IS NULL AND reply_id IS NOT NULL)
    )
);

COMMENT ON TABLE forum.reports IS 'Content reports submitted by users. Reviewed by moderators via the admin forum moderation panel.';

-- forum.moderation_log
CREATE TABLE forum.moderation_log (
    log_id          BIGSERIAL   PRIMARY KEY,
    moderator_id    UUID        NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    thread_id       UUID        REFERENCES forum.threads(thread_id) ON DELETE SET NULL,
    reply_id        UUID        REFERENCES forum.replies(reply_id) ON DELETE SET NULL,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('remove','lock','pin','unpin','unlock','restore')),
    reason          TEXT,
    actioned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE forum.moderation_log IS 'Permanent log of all moderator actions. Never deleted — part of audit infrastructure.';

-- forum.thread_summaries
CREATE TABLE forum.thread_summaries (
    summary_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID        NOT NULL UNIQUE REFERENCES forum.threads(thread_id) ON DELETE CASCADE,
    summary_text    TEXT        NOT NULL,
    generated_by    VARCHAR(50) NOT NULL DEFAULT 'openai-gpt-4',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reply_count_at_generation INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE forum.thread_summaries IS 'AI-generated summaries for high-reply threads. One summary per thread. Regenerated when reply_count changes significantly.';

-- ============================================================
-- SCHEMA: social
-- ============================================================

CREATE TABLE social.posts (
    post_id         UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        social.platform_enum        NOT NULL,
    caption         TEXT,
    media_urls      TEXT[]                      DEFAULT '{}',
    tags            TEXT[]                      DEFAULT '{}',
    hashtags        TEXT[]                      DEFAULT '{}',
    scheduled_at    TIMESTAMPTZ,
    posted_at       TIMESTAMPTZ,
    created_by      UUID                        NOT NULL REFERENCES users.users(user_id) ON DELETE RESTRICT,
    status          social.post_status_enum     NOT NULL DEFAULT 'draft',
    engagement      JSONB                       DEFAULT '{"likes":0,"shares":0,"comments":0,"reach":0}',
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  social.posts IS 'Social media content calendar. Posts are served to public feed once status=posted.';
COMMENT ON COLUMN social.posts.engagement IS 'JSONB stores engagement metrics from external platform APIs. Schema-flexible as APIs evolve.';
COMMENT ON COLUMN social.posts.media_urls IS 'GIN-indexed TEXT[] of Cloudinary/S3 CDN URLs.';

-- ============================================================
-- SCHEMA: ai_metadata
-- ============================================================

CREATE TABLE ai_metadata.event_recommendations (
    recommendation_id   SERIAL          PRIMARY KEY,
    user_id             UUID            NOT NULL REFERENCES users.users(user_id) ON DELETE CASCADE,
    event_id            UUID            NOT NULL REFERENCES events.events(event_id) ON DELETE CASCADE,
    score               FLOAT           NOT NULL CHECK (score >= 0 AND score <= 1),
    reason_vector       JSONB           NOT NULL DEFAULT '{}',
    generated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    is_dismissed        BOOLEAN         NOT NULL DEFAULT FALSE,
    UNIQUE (user_id, event_id)
);

COMMENT ON TABLE  ai_metadata.event_recommendations IS 'Scored event recommendations per user. Regenerated every 24h or on skill_tags change.';
COMMENT ON COLUMN ai_metadata.event_recommendations.reason_vector IS 'JSONB: {"matched_tags":["Flutter"],"skill_overlap":0.75,"category_match":true,"embedding_score":0.92}';
COMMENT ON COLUMN ai_metadata.event_recommendations.score        IS 'Normalised relevance score 0.0–1.0. Used for ordering on dashboard.';

-- ============================================================
-- SCHEMA: content (CMS)
-- ============================================================

CREATE TABLE content.homepage (
    id              SERIAL          PRIMARY KEY,
    hero_title      VARCHAR(300)    NOT NULL,
    hero_subtitle   TEXT,
    hero_cta_text   VARCHAR(100),
    hero_cta_url    VARCHAR(255),
    stats_members   INTEGER         DEFAULT 0,
    stats_events    INTEGER         DEFAULT 0,
    stats_projects  INTEGER         DEFAULT 0,
    announcement    TEXT,
    updated_by      UUID            REFERENCES users.users(user_id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.homepage IS 'Single-row CMS table for homepage hero and stat content.';

CREATE TABLE content.about_sections (
    section_id      SERIAL          PRIMARY KEY,
    section_key     VARCHAR(50)     NOT NULL UNIQUE,
    title           VARCHAR(200)    NOT NULL,
    body            TEXT            NOT NULL,
    display_order   INTEGER         NOT NULL DEFAULT 0,
    updated_by      UUID            REFERENCES users.users(user_id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.about_sections IS 'CMS rows for About page sections (mission, vision, history, etc.). section_key is a stable identifier.';

CREATE TABLE content.team_members (
    member_id       UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(200)                NOT NULL,
    role_title      VARCHAR(150)                NOT NULL,
    section         content.team_section_enum   NOT NULL DEFAULT 'member',
    team_name       VARCHAR(150),               -- groups members under a co_lead; NULL for non-team-specific roles
    tenure_year     VARCHAR(50),                -- displayed as a badge for past_leader section; accepts text like "2023" or "2022-2024"
    bio             TEXT,
    avatar_url      TEXT,
    linkedin_url    TEXT,
    github_url      TEXT,
    display_order   INTEGER                     NOT NULL DEFAULT 0,
    is_active       BOOLEAN                     NOT NULL DEFAULT TRUE,
    joined_at       DATE,
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content.team_members IS 'Publicly displayed team member profiles managed via CMS. Separate from users.users to allow public profiles for alumni.';
COMMENT ON COLUMN content.team_members.section    IS 'Determines which section of the team page this member appears in: gdg_lead at top, co_lead grouped below, member under their team, mentor and past_leader in their own sections.';
COMMENT ON COLUMN content.team_members.team_name  IS 'Used to group members under a specific co_lead. E.g. "Dev Team", "Design Team".';
COMMENT ON COLUMN content.team_members.tenure_year IS 'Year the leader served — displayed as a badge in the past_leader section.';

CREATE TABLE content.people (
    person_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(255)    NOT NULL,
    default_role    VARCHAR(100),               -- e.g. 'Speaker', 'Mentor' — shown in the public catalog and used as the picker default
    bio             TEXT,
    avatar_url      TEXT,
    linkedin_url    TEXT,
    organization    VARCHAR(255),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order   INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content.people IS 'Reusable directory of speakers/hosts/guests/mentors, independent of any single event. Attached to events via events.event_people. Deactivating (is_active = FALSE) removes a person from the public catalog and the event-attach picker without touching past events they are already attached to.';
COMMENT ON COLUMN content.people.default_role IS 'Default role shown in the public catalog; events.event_people.role_at_event can override this per event.';

-- Partial index: every public/picker query filters WHERE is_active = true (mirrors
-- content.team_members' idx_team_section pattern — index the filter column, not
-- display_order, since these are small CMS tables where a sorted scan is already cheap).
CREATE INDEX idx_people_is_active ON content.people(display_order) WHERE is_active = true;

-- events.event_people — join table attaching a content.people record to an
-- event with a per-event role override. Defined here (not in the events
-- schema section above) because it FKs to content.people, which must exist
-- first in table-creation order.
CREATE TABLE events.event_people (
    event_id        UUID            NOT NULL REFERENCES events.events(event_id) ON DELETE CASCADE,
    person_id       UUID            NOT NULL REFERENCES content.people(person_id) ON DELETE CASCADE,
    role_at_event   VARCHAR(100)    NOT NULL,   -- e.g. 'host', 'speaker', 'guest' — overrides content.people.default_role for this event
    display_order   INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, person_id)
);

-- No index on event_id alone: PRIMARY KEY (event_id, person_id) already gives a
-- composite btree whose leading column is event_id, so it serves "people for this
-- event" lookups for free. A separate idx_event_people_event_id would duplicate it
-- exactly the way idx_notif_prefs_user duplicates its table's PK (see BUG-006) —
-- only the reverse direction (person_id alone, for "which events is this person on")
-- needs its own index.
CREATE INDEX idx_event_people_person_id ON events.event_people USING btree (person_id);

COMMENT ON TABLE  events.event_people IS 'Join table attaching a content.people record to an event with a per-event role override. Cascade-deleted when the event is removed.';
COMMENT ON COLUMN events.event_people.role_at_event IS 'Free-text role descriptor for this specific event: host, speaker, guest, panelist, etc.';
-- No RLS on either table: consistent with every other content.* CMS table
-- (team_members, sponsors, gallery, etc.) — publicly readable, and writes are
-- already gated by requireAuth/requireRole at the API layer. Neither table has a
-- user_id to scope an RLS policy against, so adding one here would be dead policy
-- code, the same mistake BUG-004 already flags on the tables that do have RLS.

CREATE TABLE content.gallery (
    item_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200),
    media_url       TEXT            NOT NULL,
    media_type      VARCHAR(20)     NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
    event_id        UUID            REFERENCES events.events(event_id) ON DELETE SET NULL,
    category        VARCHAR(100),
    display_order   INTEGER         NOT NULL DEFAULT 0,
    uploaded_by     UUID            REFERENCES users.users(user_id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.gallery IS 'Photo and video gallery items. Optionally associated with an event.';

CREATE TABLE content.sponsors (
    sponsor_id      UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200)                NOT NULL,
    logo_url        TEXT                        NOT NULL,
    website_url     TEXT,
    tier            content.sponsor_tier_enum   NOT NULL DEFAULT 'silver',
    description     TEXT,
    display_order   INTEGER                     NOT NULL DEFAULT 0,
    is_active       BOOLEAN                     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.sponsors IS 'Sponsor profiles displayed on the public Sponsors page, tiered by partnership level.';

CREATE TABLE content.contact_submissions (
    submission_id   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name     VARCHAR(200)    NOT NULL,
    sender_email    VARCHAR(255)    NOT NULL,
    subject         VARCHAR(300),
    message         TEXT            NOT NULL,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    submitted_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.contact_submissions IS 'Read-only contact form submissions. Admins can mark as read; no edit capability.';

CREATE TABLE content.newsletter_subscribers (
    subscriber_id   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    name            VARCHAR(200),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    subscribed_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.newsletter_subscribers IS 'Newsletter signup list. Collected from the homepage subscribe section. Emails are unique; re-subscribing reactivates is_active.';

CREATE TABLE content.featured_events (
    featured_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID            REFERENCES events.events(event_id) ON DELETE SET NULL,
    title           VARCHAR(300)    NOT NULL,
    description     TEXT,
    image_url       TEXT,
    event_date      DATE,
    category        VARCHAR(100),
    display_order   INTEGER         NOT NULL DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content.featured_events IS '"Our Best Events" showcase section on the homepage. event_id is nullable — can reference a platform event or be a fully standalone entry.';
COMMENT ON COLUMN content.featured_events.event_id IS 'NULL for custom/historical entries that predate the platform. Non-null for events managed within the system.';

CREATE TABLE content.teams (
    team_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150)    NOT NULL UNIQUE,
    display_order   INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.teams IS 'Named teams that members (co_lead / member) can be grouped under. Managed from the Team CMS. team_members.team_name references the name column here.';

-- ============================================================
-- SCHEMA: audit
-- ============================================================

CREATE TABLE audit.logs (
    log_id      BIGSERIAL               NOT NULL,
    table_name  VARCHAR(100)            NOT NULL,
    record_id   TEXT                    NOT NULL,
    operation   audit.operation_enum    NOT NULL,
    old_values  JSONB,
    new_values  JSONB,
    changed_by  UUID                    REFERENCES users.users(user_id) ON DELETE SET NULL,
    changed_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    ip_address  INET,
    session_id  TEXT,
    PRIMARY KEY (log_id, changed_at)
) PARTITION BY RANGE (changed_at);

COMMENT ON TABLE  audit.logs IS 'Immutable audit log. Range-partitioned monthly by changed_at. INSERT-only for app_role.';
COMMENT ON COLUMN audit.logs.old_values IS 'Full row snapshot before change as JSONB. NULL for INSERTs.';
COMMENT ON COLUMN audit.logs.new_values IS 'Full row snapshot after change as JSONB. NULL for DELETEs.';
COMMENT ON COLUMN audit.logs.changed_by IS 'NULL for system-triggered operations (cron jobs, auto-transitions).';

-- Create monthly partitions for 2026
CREATE TABLE audit.logs_2026_01 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit.logs_2026_02 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit.logs_2026_03 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit.logs_2026_04 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit.logs_2026_05 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit.logs_2026_06 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit.logs_2026_07 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit.logs_2026_08 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit.logs_2026_09 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit.logs_2026_10 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit.logs_2026_11 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit.logs_2026_12 PARTITION OF audit.logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- ============================================================
-- SCHEMA: notifications
-- ============================================================

CREATE TABLE notifications.notifications (
    notification_id UUID                                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                                    NOT NULL REFERENCES users.users(user_id) ON DELETE CASCADE,
    type            notifications.notification_type_enum   NOT NULL,
    title           VARCHAR(200)                           NOT NULL,
    message         TEXT                                    NOT NULL,
    action_url      TEXT,
    is_read         BOOLEAN                                 NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ                             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications.notifications USING btree (user_id, is_read);

COMMENT ON TABLE  notifications.notifications IS 'Per-user in-app notifications. Cascade-deleted when the user is removed. Indexed on (user_id, is_read) for efficient unread-count queries.';
COMMENT ON COLUMN notifications.notifications.action_url IS 'Optional deep-link URL to the relevant resource (e.g. /events/:id, /forum/:id). NULL if no action is required.';

-- ============================================================
-- INDEXES
-- ============================================================

-- users schema
CREATE UNIQUE INDEX idx_users_email       ON users.users(email);
CREATE UNIQUE INDEX idx_users_username    ON users.users(username) WHERE username IS NOT NULL;
CREATE INDEX        idx_users_role        ON users.users(role_id);
CREATE INDEX        idx_users_skill_tags  ON users.users USING GIN(skill_tags);
CREATE INDEX        idx_users_active      ON users.users(is_active) WHERE is_active = TRUE;

-- events schema
CREATE INDEX        idx_events_status_start    ON events.events(status, start_datetime);
CREATE INDEX        idx_events_category        ON events.events(category_id);
CREATE INDEX        idx_events_created_by      ON events.events(created_by);
CREATE INDEX        idx_events_tags            ON events.events USING GIN(tags);
CREATE INDEX        idx_events_free            ON events.events(is_free);
CREATE INDEX        idx_registrations_event    ON events.registrations(event_id);
CREATE INDEX        idx_registrations_user     ON events.registrations(user_id);
CREATE INDEX        idx_registrations_payment  ON events.registrations(payment_status);

-- payments schema
CREATE UNIQUE INDEX idx_txn_gateway_ref  ON payments.transactions(gateway_reference) WHERE gateway_reference IS NOT NULL;
CREATE UNIQUE INDEX idx_txn_invoice      ON payments.transactions(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX        idx_txn_user         ON payments.transactions(user_id);
CREATE INDEX        idx_txn_event        ON payments.transactions(event_id);
CREATE INDEX        idx_txn_status       ON payments.transactions(status);
CREATE INDEX        idx_txn_initiated    ON payments.transactions(initiated_at DESC);

-- forum schema
CREATE INDEX        idx_threads_tsv       ON forum.threads USING GIN(tsv);
CREATE INDEX        idx_threads_author    ON forum.threads(author_id);
CREATE INDEX        idx_threads_category  ON forum.threads(category_id);
CREATE INDEX        idx_threads_created   ON forum.threads(created_at DESC);
CREATE INDEX        idx_threads_pinned    ON forum.threads(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX        idx_threads_active    ON forum.threads(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX        idx_threads_tags      ON forum.threads USING GIN(tags);
CREATE INDEX        idx_replies_thread    ON forum.replies(thread_id);
CREATE INDEX        idx_replies_parent    ON forum.replies(parent_reply_id) WHERE parent_reply_id IS NOT NULL;
CREATE INDEX        idx_replies_author    ON forum.replies(author_id);
CREATE INDEX        idx_upvotes_user      ON forum.upvotes(user_id);
CREATE INDEX        idx_reports_status    ON forum.reports(status) WHERE status = 'pending';

-- social schema
CREATE INDEX        idx_social_status    ON social.posts(status);
CREATE INDEX        idx_social_platform  ON social.posts(platform);
CREATE INDEX        idx_social_scheduled ON social.posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX        idx_social_tags      ON social.posts USING GIN(tags);
CREATE INDEX        idx_social_posted    ON social.posts(posted_at DESC) WHERE status = 'posted';

-- ai_metadata schema
CREATE INDEX        idx_ai_recs_user      ON ai_metadata.event_recommendations(user_id);
CREATE INDEX        idx_ai_recs_score     ON ai_metadata.event_recommendations(score DESC) WHERE is_dismissed = FALSE;
CREATE INDEX        idx_ai_recs_generated ON ai_metadata.event_recommendations(generated_at DESC);

-- audit schema (applied to each partition automatically)
CREATE INDEX        idx_audit_changed_at  ON audit.logs(changed_at DESC);
CREATE INDEX        idx_audit_table_rec   ON audit.logs(table_name, record_id);
CREATE INDEX        idx_audit_changed_by  ON audit.logs(changed_by) WHERE changed_by IS NOT NULL;

-- forum.categories
CREATE INDEX        idx_forum_categories_order ON forum.categories(display_order);

-- content schema (new tables)
CREATE UNIQUE INDEX idx_newsletter_email       ON content.newsletter_subscribers(email);
CREATE INDEX        idx_newsletter_active      ON content.newsletter_subscribers(is_active) WHERE is_active = TRUE;
CREATE INDEX        idx_featured_events_active ON content.featured_events(is_active, display_order) WHERE is_active = TRUE;
CREATE INDEX        idx_featured_events_event  ON content.featured_events(event_id) WHERE event_id IS NOT NULL;

-- content.team_members (new column indexes)
CREATE INDEX        idx_team_section           ON content.team_members(section);
CREATE INDEX        idx_team_name              ON content.team_members(team_name) WHERE team_name IS NOT NULL;
CREATE INDEX        idx_teams_display_order    ON content.teams(display_order);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- 1. Universal updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at IS 'Universal BEFORE UPDATE trigger. Sets updated_at = NOW() on any table that has this column.';

-- 2. Universal audit log trigger
CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_record_id TEXT;
    v_old_json  JSONB;
    v_new_json  JSONB;
BEGIN
    -- Determine record ID (assumes first column is the PK)
    IF TG_OP = 'DELETE' THEN
        v_record_id := (row_to_json(OLD) ->> (TG_ARGV[0]));
        v_old_json  := to_jsonb(OLD);
        v_new_json  := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id := (row_to_json(NEW) ->> (TG_ARGV[0]));
        v_old_json  := NULL;
        v_new_json  := to_jsonb(NEW);
    ELSE -- UPDATE
        v_record_id := (row_to_json(NEW) ->> (TG_ARGV[0]));
        v_old_json  := to_jsonb(OLD);
        v_new_json  := to_jsonb(NEW);
    END IF;

    INSERT INTO audit.logs (
        table_name, record_id, operation,
        old_values, new_values,
        changed_by, changed_at,
        ip_address, session_id
    ) VALUES (
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        v_record_id,
        TG_OP::audit.operation_enum,
        v_old_json,
        v_new_json,
        NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        NOW(),
        NULLIF(current_setting('app.client_ip', TRUE), '')::INET,
        NULLIF(current_setting('app.session_id', TRUE), '')
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION audit.log_change IS
'Universal AFTER trigger for immutable audit logging. Reads current_user_id, client_ip, session_id
from session-level settings (set by application middleware before each statement).
TG_ARGV[0] = name of the primary key column (e.g. "user_id").';

-- 3. Seat counter trigger function
CREATE OR REPLACE FUNCTION events.seat_counter()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Lock the event row to prevent race conditions
        PERFORM 1 FROM events.events WHERE event_id = NEW.event_id FOR UPDATE;

        -- Check seat availability
        IF (SELECT seats_registered FROM events.events WHERE event_id = NEW.event_id)
           >= (SELECT max_seats FROM events.events WHERE event_id = NEW.event_id) THEN
            RAISE EXCEPTION 'EVENT_FULL: No seats remaining for event %', NEW.event_id;
        END IF;

        UPDATE events.events
        SET seats_registered = seats_registered + 1
        WHERE event_id = NEW.event_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events.events
        SET seats_registered = GREATEST(seats_registered - 1, 0)
        WHERE event_id = OLD.event_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION events.seat_counter IS
'AFTER INSERT/DELETE trigger on events.registrations.
INSERT: Acquires row lock on event, checks capacity, increments seats_registered.
Raises EXCEPTION EVENT_FULL if at capacity — causes calling transaction to roll back.
DELETE: Decrements seats_registered (floor 0) when a registration is removed.';

-- 4. Forum TSV update trigger function
CREATE OR REPLACE FUNCTION forum.update_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.tsv = to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.body, '')  || ' ' ||
        COALESCE(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION forum.update_tsv IS
'BEFORE INSERT/UPDATE trigger on forum.threads.
Regenerates the GIN-indexed tsvector column from title, body, and tags.
Includes tags in the search corpus for tag-aware full-text search.';

-- 5. Forum reply counter trigger function
CREATE OR REPLACE FUNCTION forum.reply_counter()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
        UPDATE forum.threads
        SET reply_count = reply_count + 1
        WHERE thread_id = NEW.thread_id;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle soft delete toggling
        IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
            UPDATE forum.threads
            SET reply_count = GREATEST(reply_count - 1, 0)
            WHERE thread_id = NEW.thread_id;
        ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
            UPDATE forum.threads
            SET reply_count = reply_count + 1
            WHERE thread_id = NEW.thread_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum.threads
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE thread_id = OLD.thread_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION forum.reply_counter IS
'AFTER INSERT/UPDATE/DELETE trigger on forum.replies.
Maintains the denormalised reply_count column on forum.threads.
Handles soft-delete toggling (is_deleted flip) correctly.';

-- 6. Forum upvote counter trigger function
CREATE OR REPLACE FUNCTION forum.upvote_counter()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.thread_id IS NOT NULL THEN
            UPDATE forum.threads  SET upvote_count = upvote_count + 1 WHERE thread_id = NEW.thread_id;
        ELSIF NEW.reply_id IS NOT NULL THEN
            UPDATE forum.replies  SET upvote_count = upvote_count + 1 WHERE reply_id = NEW.reply_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.thread_id IS NOT NULL THEN
            UPDATE forum.threads  SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE thread_id = OLD.thread_id;
        ELSIF OLD.reply_id IS NOT NULL THEN
            UPDATE forum.replies  SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE reply_id = OLD.reply_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION forum.upvote_counter IS
'AFTER INSERT/DELETE trigger on forum.upvotes.
Increments or decrements upvote_count on the corresponding thread or reply.
CHECK constraint on forum.upvotes ensures target is exclusively thread or reply.';

-- ============================================================
-- ATTACH TRIGGERS
-- ============================================================

-- updated_at triggers
CREATE TRIGGER trg_users_updated_at           BEFORE UPDATE ON users.users                  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated_at          BEFORE UPDATE ON events.events                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_txn_updated_at             BEFORE UPDATE ON payments.transactions         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_threads_updated_at         BEFORE UPDATE ON forum.threads                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_replies_updated_at         BEFORE UPDATE ON forum.replies                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_social_updated_at          BEFORE UPDATE ON social.posts                 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sponsors_updated_at        BEFORE UPDATE ON content.sponsors             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_team_updated_at            BEFORE UPDATE ON content.team_members         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_homepage_updated_at        BEFORE UPDATE ON content.homepage             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_about_updated_at           BEFORE UPDATE ON content.about_sections       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_featured_events_updated_at BEFORE UPDATE ON content.featured_events      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit triggers (pass PK column name as argument)
CREATE TRIGGER trg_audit_users          AFTER INSERT OR UPDATE OR DELETE ON users.users                FOR EACH ROW EXECUTE FUNCTION audit.log_change('user_id');
CREATE TRIGGER trg_audit_events         AFTER INSERT OR UPDATE OR DELETE ON events.events              FOR EACH ROW EXECUTE FUNCTION audit.log_change('event_id');
CREATE TRIGGER trg_audit_regs           AFTER INSERT OR UPDATE OR DELETE ON events.registrations       FOR EACH ROW EXECUTE FUNCTION audit.log_change('registration_id');
CREATE TRIGGER trg_audit_txns           AFTER INSERT OR UPDATE OR DELETE ON payments.transactions      FOR EACH ROW EXECUTE FUNCTION audit.log_change('transaction_id');
CREATE TRIGGER trg_audit_threads        AFTER INSERT OR UPDATE OR DELETE ON forum.threads              FOR EACH ROW EXECUTE FUNCTION audit.log_change('thread_id');
CREATE TRIGGER trg_audit_replies        AFTER INSERT OR UPDATE OR DELETE ON forum.replies              FOR EACH ROW EXECUTE FUNCTION audit.log_change('reply_id');
CREATE TRIGGER trg_audit_social         AFTER INSERT OR UPDATE OR DELETE ON social.posts               FOR EACH ROW EXECUTE FUNCTION audit.log_change('post_id');
CREATE TRIGGER trg_audit_event_people   AFTER INSERT OR UPDATE OR DELETE ON events.event_people        FOR EACH ROW EXECUTE FUNCTION audit.log_change('person_id');
CREATE TRIGGER trg_audit_featured       AFTER INSERT OR UPDATE OR DELETE ON content.featured_events    FOR EACH ROW EXECUTE FUNCTION audit.log_change('featured_id');
CREATE TRIGGER trg_audit_team           AFTER INSERT OR UPDATE OR DELETE ON content.team_members       FOR EACH ROW EXECUTE FUNCTION audit.log_change('member_id');

-- Seat counter triggers
CREATE TRIGGER trg_seat_counter
    AFTER INSERT OR DELETE ON events.registrations
    FOR EACH ROW EXECUTE FUNCTION events.seat_counter();

-- Forum TSV trigger
CREATE TRIGGER trg_forum_tsv
    BEFORE INSERT OR UPDATE OF title, body, tags ON forum.threads
    FOR EACH ROW EXECUTE FUNCTION forum.update_tsv();

-- Forum reply counter triggers
CREATE TRIGGER trg_reply_counter
    AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON forum.replies
    FOR EACH ROW EXECUTE FUNCTION forum.reply_counter();

-- Forum upvote counter triggers
CREATE TRIGGER trg_upvote_counter
    AFTER INSERT OR DELETE ON forum.upvotes
    FOR EACH ROW EXECUTE FUNCTION forum.upvote_counter();

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure 1: register_user_for_event
CREATE OR REPLACE PROCEDURE public.register_user_for_event(
    p_user_id   UUID,
    p_event_id  UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_event         events.events%ROWTYPE;
    v_registration  events.registrations%ROWTYPE;
BEGIN
    -- Lock the event row exclusively to prevent concurrent race conditions
    SELECT * INTO v_event
    FROM events.events
    WHERE event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND: Event % does not exist.', p_event_id;
    END IF;

    IF v_event.status NOT IN ('published', 'ongoing') THEN
        RAISE EXCEPTION 'EVENT_UNAVAILABLE: Event is in % status and cannot accept registrations.', v_event.status;
    END IF;

    IF v_event.seats_registered >= v_event.max_seats THEN
        RAISE EXCEPTION 'EVENT_FULL: No seats remaining for event %.', p_event_id;
    END IF;

    -- Check for duplicate registration (belt-and-suspenders; DB UNIQUE handles this too)
    IF EXISTS (
        SELECT 1 FROM events.registrations
        WHERE event_id = p_event_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'ALREADY_REGISTERED: User % is already registered for event %.', p_user_id, p_event_id;
    END IF;

    -- Insert registration
    -- The seat_counter trigger will handle incrementing seats_registered
    INSERT INTO events.registrations (
        event_id, user_id,
        payment_status
    ) VALUES (
        p_event_id, p_user_id,
        CASE WHEN v_event.is_free THEN 'completed'::events.payment_status_enum
             ELSE 'pending'::events.payment_status_enum END
    )
    RETURNING * INTO v_registration;

    RAISE NOTICE 'REGISTRATION_SUCCESS: registration_id = %', v_registration.registration_id;
END;
$$;

COMMENT ON PROCEDURE public.register_user_for_event IS
'Encapsulates the full event registration workflow in a single transaction.
Call this under SERIALIZABLE isolation from the application layer.
Validates status, checks capacity with FOR UPDATE row lock, inserts registration.
The seat_counter trigger handles seats_registered increment atomically.
Raises named exceptions: EVENT_NOT_FOUND, EVENT_UNAVAILABLE, EVENT_FULL, ALREADY_REGISTERED.';

-- Procedure 2: process_payment
CREATE OR REPLACE PROCEDURE public.process_payment(
    p_transaction_id    UUID,
    p_gateway_response  JSONB,
    p_status            payments.transaction_status_enum DEFAULT 'success'
)
LANGUAGE plpgsql AS $$
DECLARE
    v_txn       payments.transactions%ROWTYPE;
    v_inv_num   TEXT;
BEGIN
    SELECT * INTO v_txn
    FROM payments.transactions
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TRANSACTION_NOT_FOUND: Transaction % does not exist.', p_transaction_id;
    END IF;

    IF v_txn.status != 'pending' THEN
        RAISE EXCEPTION 'TRANSACTION_ALREADY_PROCESSED: Transaction % has status %.', p_transaction_id, v_txn.status;
    END IF;

    -- Generate invoice number only on success
    IF p_status = 'success' THEN
        v_inv_num := 'INV-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('payments.invoice_seq')::TEXT, 6, '0');
    END IF;

    -- Update transaction record
    UPDATE payments.transactions SET
        status          = p_status,
        metadata        = p_gateway_response,
        invoice_number  = v_inv_num,
        completed_at    = CASE WHEN p_status = 'success' THEN NOW() ELSE NULL END,
        updated_at      = NOW()
    WHERE transaction_id = p_transaction_id;

    -- Update related registration payment_status
    UPDATE events.registrations SET
        payment_status = CASE WHEN p_status = 'success' THEN 'completed'::events.payment_status_enum
                              ELSE 'failed'::events.payment_status_enum END
    WHERE transaction_id = p_transaction_id;

    IF p_status = 'success' THEN
        RAISE NOTICE 'PAYMENT_SUCCESS: invoice_number = %', v_inv_num;
    END IF;
END;
$$;

COMMENT ON PROCEDURE public.process_payment IS
'Processes gateway payment confirmation for a pending transaction.
Atomically: updates transaction status, stores JSONB gateway response,
generates invoice_number via sequence (on success), updates registration payment_status.
Raises: TRANSACTION_NOT_FOUND, TRANSACTION_ALREADY_PROCESSED.';

-- Procedure 3: moderate_forum_content
CREATE OR REPLACE PROCEDURE public.moderate_forum_content(
    p_content_id    UUID,
    p_content_type  TEXT,          -- 'thread' or 'reply'
    p_action        TEXT,          -- 'remove','lock','pin','unpin','unlock','restore'
    p_moderator_id  UUID,
    p_reason        TEXT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_thread_id UUID;
    v_reply_id  UUID;
BEGIN
    IF p_content_type NOT IN ('thread', 'reply') THEN
        RAISE EXCEPTION 'INVALID_CONTENT_TYPE: Must be thread or reply.';
    END IF;

    IF p_action NOT IN ('remove','lock','pin','unpin','unlock','restore') THEN
        RAISE EXCEPTION 'INVALID_ACTION: % is not a valid moderation action.', p_action;
    END IF;

    IF p_content_type = 'thread' THEN
        v_thread_id := p_content_id;

        UPDATE forum.threads SET
            is_deleted = CASE p_action WHEN 'remove'   THEN TRUE  ELSE is_deleted END,
            is_locked  = CASE p_action WHEN 'lock'     THEN TRUE
                                       WHEN 'unlock'   THEN FALSE ELSE is_locked  END,
            is_pinned  = CASE p_action WHEN 'pin'      THEN TRUE
                                       WHEN 'unpin'    THEN FALSE ELSE is_pinned  END,
            is_deleted = CASE p_action WHEN 'restore'  THEN FALSE ELSE is_deleted END,
            updated_at = NOW()
        WHERE thread_id = p_content_id;

    ELSIF p_content_type = 'reply' THEN
        v_reply_id := p_content_id;

        UPDATE forum.replies SET
            is_deleted = CASE p_action WHEN 'remove'  THEN TRUE
                                       WHEN 'restore' THEN FALSE ELSE is_deleted END,
            updated_at = NOW()
        WHERE reply_id = p_content_id;
    END IF;

    -- Log moderation action permanently
    INSERT INTO forum.moderation_log (
        moderator_id, thread_id, reply_id, action, reason
    ) VALUES (
        p_moderator_id, v_thread_id, v_reply_id, p_action, p_reason
    );

    RAISE NOTICE 'MODERATION_SUCCESS: % action % applied by %.', p_content_type, p_action, p_moderator_id;
END;
$$;

COMMENT ON PROCEDURE public.moderate_forum_content IS
'Executes a moderator action on a forum thread or reply.
Validates content_type and action. Applies state changes.
Inserts a permanent record into forum.moderation_log.
Permission validation (forum.moderate) is enforced at the API middleware layer before calling this procedure.';

-- Procedure 4: generate_ai_recommendations
CREATE OR REPLACE PROCEDURE public.generate_ai_recommendations(
    p_user_id   UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_user          users.users%ROWTYPE;
    v_rec           RECORD;
    v_score         FLOAT;
    v_reason        JSONB;
    v_matched_tags  TEXT[];
BEGIN
    SELECT * INTO v_user FROM users.users WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: User % does not exist.', p_user_id;
    END IF;

    -- Clear non-dismissed stale recommendations older than 24 hours
    DELETE FROM ai_metadata.event_recommendations
    WHERE user_id = p_user_id
      AND is_dismissed = FALSE
      AND generated_at < NOW() - INTERVAL '24 hours';

    -- Generate new recommendations from upcoming published events
    FOR v_rec IN
        SELECT
            e.event_id,
            e.tags,
            e.category_id,
            e.title,
            c.name AS category_name
        FROM events.events e
        LEFT JOIN events.categories c ON e.category_id = c.category_id
        WHERE e.status = 'published'
          AND e.start_datetime > NOW()
          -- Exclude events already registered for
          AND NOT EXISTS (
              SELECT 1 FROM events.registrations r
              WHERE r.event_id = e.event_id AND r.user_id = p_user_id
          )
          -- Exclude already dismissed recommendations
          AND NOT EXISTS (
              SELECT 1 FROM ai_metadata.event_recommendations ar
              WHERE ar.event_id = e.event_id AND ar.user_id = p_user_id AND ar.is_dismissed = TRUE
          )
    LOOP
        -- Compute tag overlap between user skill_tags and event tags
        v_matched_tags := ARRAY(
            SELECT UNNEST(v_user.skill_tags)
            INTERSECT
            SELECT UNNEST(v_rec.tags)
        );

        -- Score: tag overlap ratio (0.0–0.8) + category name match bonus (0.2)
        v_score := LEAST(
            CASE
                WHEN array_length(v_rec.tags, 1) > 0 THEN
                    (array_length(v_matched_tags, 1)::FLOAT / array_length(v_rec.tags, 1)::FLOAT) * 0.8
                ELSE 0.0
            END
            +
            CASE
                WHEN v_rec.category_name = ANY(v_user.skill_tags) THEN 0.2
                ELSE 0.0
            END,
        1.0);

        -- Only recommend if there is any overlap or match
        IF v_score > 0 THEN
            v_reason := jsonb_build_object(
                'matched_tags',    to_jsonb(v_matched_tags),
                'category_match',  (v_rec.category_name = ANY(v_user.skill_tags)),
                'event_title',     v_rec.title,
                'score_breakdown', jsonb_build_object('tag_overlap', v_score)
            );

            INSERT INTO ai_metadata.event_recommendations
                (user_id, event_id, score, reason_vector, generated_at, is_dismissed)
            VALUES
                (p_user_id, v_rec.event_id, v_score, v_reason, NOW(), FALSE)
            ON CONFLICT (user_id, event_id) DO UPDATE SET
                score        = EXCLUDED.score,
                reason_vector = EXCLUDED.reason_vector,
                generated_at = EXCLUDED.generated_at,
                is_dismissed = FALSE;
        END IF;
    END LOOP;

    RAISE NOTICE 'AI_RECS_GENERATED: Recommendations refreshed for user %.', p_user_id;
END;
$$;

COMMENT ON PROCEDURE public.generate_ai_recommendations IS
'SQL-only recommendation engine using array overlap between user.skill_tags and event.tags.
Clears stale non-dismissed recommendations. Scores each upcoming published event.
Score = tag overlap ratio (0–0.8) + category name match bonus (0.2). Max 1.0.
UPSERTS results into ai_metadata.event_recommendations.
Optional: augment scores with OpenAI Embeddings API in the application layer after calling this procedure.';

-- ============================================================
-- VIEWS
-- ============================================================

-- View 1: events.v_event_summary
CREATE OR REPLACE VIEW events.v_event_summary AS
SELECT
    e.event_id,
    e.title,
    e.description,
    e.event_type,
    e.status,
    c.name          AS category_name,
    c.color_hex     AS category_color,
    e.start_datetime,
    e.end_datetime,
    e.venue,
    e.is_online,
    e.meeting_link,
    e.max_seats,
    e.seats_registered,
    (e.max_seats - e.seats_registered)  AS seats_available,
    ROUND((e.seats_registered::NUMERIC / NULLIF(e.max_seats, 0)) * 100, 1) AS fill_percentage,
    e.is_free,
    e.ticket_price,
    e.banner_url,
    e.tags,
    u.full_name     AS created_by_name,
    u.avatar_url    AS created_by_avatar,
    e.created_at,
    e.updated_at
FROM events.events e
LEFT JOIN events.categories c ON e.category_id = c.category_id
LEFT JOIN users.users u ON e.created_by = u.user_id;

COMMENT ON VIEW events.v_event_summary IS 'Pre-joined event listing view. Used by all event listing API endpoints. Includes seat fill percentage.';

-- View 2: users.v_user_profile
CREATE OR REPLACE VIEW users.v_user_profile AS
SELECT
    u.user_id,
    u.email,
    u.full_name,
    u.username,
    u.avatar_url,
    u.bio,
    u.skill_tags,
    u.is_verified,
    u.is_active,
    u.last_login,
    u.created_at,
    r.role_id,
    r.role_name,
    ARRAY_AGG(p.permission_name ORDER BY p.permission_name) AS permissions
FROM users.users u
JOIN users.roles r ON u.role_id = r.role_id
LEFT JOIN users.role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN users.permissions p ON rp.permission_id = p.permission_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, r.role_id, r.role_name;

COMMENT ON VIEW users.v_user_profile IS 'Returns user with role_name and flattened permissions array. Used by JWT issuance and RBAC middleware. Filters inactive users.';

-- View 3: forum.v_thread_preview
CREATE OR REPLACE VIEW forum.v_thread_preview AS
SELECT
    t.thread_id,
    t.title,
    LEFT(t.body, 300)       AS body_preview,
    c.name                  AS category_name,
    c.color_hex             AS category_color,
    t.tags,
    t.is_pinned,
    t.is_locked,
    t.view_count,
    t.upvote_count,
    t.reply_count,
    t.created_at,
    t.updated_at,
    u.user_id               AS author_id,
    u.full_name             AS author_name,
    u.avatar_url            AS author_avatar,
    (SELECT MAX(r.created_at) FROM forum.replies r WHERE r.thread_id = t.thread_id AND NOT r.is_deleted)
                            AS last_reply_at
FROM forum.threads t
JOIN users.users u ON t.author_id = u.user_id
LEFT JOIN forum.categories c ON t.category_id = c.category_id
WHERE t.is_deleted = FALSE;

COMMENT ON VIEW forum.v_thread_preview IS 'Thread listing view with author info, forum category, and last reply timestamp. Excludes soft-deleted threads.';

-- View 4: payments.v_transaction_report
CREATE OR REPLACE VIEW payments.v_transaction_report AS
SELECT
    tx.transaction_id,
    tx.invoice_number,
    tx.status,
    tx.amount,
    tx.currency,
    tx.gateway,
    tx.payment_method,
    tx.initiated_at,
    tx.completed_at,
    tx.refunded_at,
    u.user_id,
    u.full_name         AS payer_name,
    u.email             AS payer_email,
    e.event_id,
    e.title             AS event_title,
    e.start_datetime    AS event_date,
    r.registration_id,
    r.payment_status    AS registration_status
FROM payments.transactions tx
JOIN users.users u           ON tx.user_id = u.user_id
JOIN events.events e         ON tx.event_id = e.event_id
LEFT JOIN events.registrations r ON tx.transaction_id = r.transaction_id;

COMMENT ON VIEW payments.v_transaction_report IS 'Financial reporting view joining transactions, users, and events. Used by admin payments dashboard. Never expose tx.metadata (JSONB gateway raw response) in this view.';

-- View 5: audit.v_recent_activity (last 200 entries)
CREATE OR REPLACE VIEW audit.v_recent_activity AS
SELECT
    l.log_id,
    l.table_name,
    l.record_id,
    l.operation,
    l.changed_at,
    l.ip_address,
    l.session_id,
    COALESCE(u.full_name, 'System') AS changed_by_name,
    u.email                          AS changed_by_email,
    l.old_values,
    l.new_values
FROM audit.logs l
LEFT JOIN users.users u ON l.changed_by = u.user_id
ORDER BY l.changed_at DESC
LIMIT 200;

COMMENT ON VIEW audit.v_recent_activity IS 'Admin-facing view of the 200 most recent audit entries with human-readable actor names. Super Admin access only.';

-- View 6: ai_metadata.v_trending_topics (materialized, refreshed every 6h)
CREATE MATERIALIZED VIEW ai_metadata.v_trending_topics AS
SELECT
    tag,
    COUNT(*)                        AS frequency,
    'forum'::TEXT                   AS source,
    MAX(created_at)                 AS last_seen_at
FROM (
    SELECT UNNEST(tags) AS tag, created_at FROM forum.threads WHERE is_deleted = FALSE
) forum_tags
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY tag

UNION ALL

SELECT
    tag,
    COUNT(*)                        AS frequency,
    'events'::TEXT                  AS source,
    MAX(created_at)                 AS last_seen_at
FROM (
    SELECT UNNEST(tags) AS tag, created_at FROM events.events WHERE status IN ('published','ongoing','completed')
) event_tags
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY tag
ORDER BY frequency DESC;

COMMENT ON MATERIALIZED VIEW ai_metadata.v_trending_topics IS
'Aggregates tag frequency from forum threads and events over a rolling 7-day window.
Refreshed every 6 hours via pg_cron: SELECT cron.schedule(''refresh-trending'', ''0 */6 * * *'', ''REFRESH MATERIALIZED VIEW CONCURRENTLY ai_metadata.v_trending_topics'');
Served to homepage trending section and user dashboard.';

CREATE UNIQUE INDEX idx_trending_tag_source ON ai_metadata.v_trending_topics (tag, source);

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.registrations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.logs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.notifications     ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins can read all
CREATE POLICY users_self_policy ON users.users
    USING (user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
           OR current_setting('app.current_role', TRUE) IN ('admin', 'super_admin'));

-- Users see only their own registrations; admins see all
CREATE POLICY registrations_self_policy ON events.registrations
    USING (user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
           OR current_setting('app.current_role', TRUE) IN ('admin', 'super_admin'));

-- Users see only their own transactions; admins see all
CREATE POLICY transactions_self_policy ON payments.transactions
    USING (user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
           OR current_setting('app.current_role', TRUE) IN ('admin', 'super_admin'));

-- Audit log visible to super_admin only
CREATE POLICY audit_superadmin_policy ON audit.logs
    USING (current_setting('app.current_role', TRUE) = 'super_admin');

-- Users see only their own notifications; admins see all
CREATE POLICY notifications_self_policy ON notifications.notifications
    USING (user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
           OR current_setting('app.current_role', TRUE) IN ('admin', 'super_admin'));

-- ============================================================
-- APPLICATION DATABASE ROLES & GRANTS
-- ============================================================

-- Create application role (least-privilege)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gdgoc_app') THEN
        CREATE ROLE gdgoc_app LOGIN PASSWORD 'CHANGE_IN_PRODUCTION';
    END IF;
END $$;

-- Grant schema usage
GRANT USAGE ON SCHEMA users, events, payments, forum, social, ai_metadata, content, audit, notifications
    TO gdgoc_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON
    users.users, users.roles, users.permissions, users.role_permissions,
    users.password_reset_tokens, users.notification_preferences,
    events.events, events.registrations, events.categories, events.event_people,
    payments.transactions,
    forum.categories, forum.threads, forum.replies, forum.upvotes, forum.reports, forum.moderation_log, forum.thread_summaries,
    social.posts,
    ai_metadata.event_recommendations,
    content.homepage, content.about_sections, content.team_members, content.gallery, content.sponsors,
    content.contact_submissions, content.newsletter_subscribers, content.featured_events, content.teams,
    notifications.notifications
    TO gdgoc_app;

-- Teams: full CRUD (CMS allows creation, reordering, and deletion)
GRANT DELETE ON content.teams TO gdgoc_app;

-- Audit log: INSERT only (immutability enforced)
GRANT INSERT ON audit.logs TO gdgoc_app;

-- Sequences
GRANT USAGE ON SEQUENCE payments.invoice_seq TO gdgoc_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA users, events, forum, content TO gdgoc_app;

-- Execute stored procedures
GRANT EXECUTE ON PROCEDURE public.register_user_for_event(UUID, UUID) TO gdgoc_app;
GRANT EXECUTE ON PROCEDURE public.process_payment(UUID, JSONB, payments.transaction_status_enum) TO gdgoc_app;
GRANT EXECUTE ON PROCEDURE public.moderate_forum_content(UUID, TEXT, TEXT, UUID, TEXT) TO gdgoc_app;
GRANT EXECUTE ON PROCEDURE public.generate_ai_recommendations(UUID) TO gdgoc_app;

-- View access
GRANT SELECT ON
    events.v_event_summary,
    users.v_user_profile,
    forum.v_thread_preview,
    payments.v_transaction_report,
    audit.v_recent_activity,
    ai_metadata.v_trending_topics
    TO gdgoc_app;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
