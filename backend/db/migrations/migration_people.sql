-- ============================================================
-- Migration: content.people + events.event_people rebuild
-- Pulls person profile data (speakers/hosts/guests/mentors) out of
-- events.event_people into a standalone, reusable content.people directory.
-- events.event_people becomes a pure join table (event_id, person_id,
-- role_at_event, display_order).
--
-- Existing events.event_people data is test data and is intentionally
-- dropped, not migrated.
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

DROP TABLE IF EXISTS events.event_people;

CREATE TABLE content.people (
    person_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(255)    NOT NULL,
    default_role    VARCHAR(100),
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

CREATE TABLE events.event_people (
    event_id        UUID            NOT NULL REFERENCES events.events(event_id) ON DELETE CASCADE,
    person_id       UUID            NOT NULL REFERENCES content.people(person_id) ON DELETE CASCADE,
    role_at_event   VARCHAR(100)    NOT NULL,
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
-- already gated by requireAuth/requireRole at the API layer (backend/src/routes/
-- cms.ts, events.ts). Neither table has a user_id to scope an RLS policy against,
-- so adding one here would be dead policy code, the same mistake BUG-004 already
-- flags on the tables that do have RLS enabled.

-- Grant the application role access (mirrors the other content/events tables).
-- Adjust the role name if your DATABASE_URL connects as a different user.
GRANT SELECT, INSERT, UPDATE, DELETE ON content.people TO gdgoc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON events.event_people TO gdgoc_app;
