-- ============================================================
-- Migration: content.teams
-- Adds a dedicated table so teams can be created independently
-- (CMS "Create a Team") and offered as a dropdown when adding members.
-- Run this once in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS content.teams (
    team_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150)    NOT NULL UNIQUE,
    display_order INTEGER         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE content.teams IS
'Named teams that members (co_lead / member) can be grouped under. Managed from the Team CMS.';

-- Grant the application role access (mirrors the other content tables).
-- Adjust the role name if your DATABASE_URL connects as a different user.
GRANT SELECT, INSERT, UPDATE, DELETE ON content.teams TO gdgoc_app;

-- (Optional) Seed teams from team names already used on existing members:
-- INSERT INTO content.teams (name)
-- SELECT DISTINCT team_name FROM content.team_members
-- WHERE team_name IS NOT NULL AND TRIM(team_name) <> ''
-- ON CONFLICT (name) DO NOTHING;
