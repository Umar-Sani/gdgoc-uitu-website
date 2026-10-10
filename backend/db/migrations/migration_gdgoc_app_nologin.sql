-- TODO-015: remove the well-known credential from the gdgoc_app role.
--
-- Databases built from earlier versions of GDGOC_UITU_schema.sql have gdgoc_app with
-- LOGIN and the literal password 'CHANGE_IN_PRODUCTION', which is public in git history.
-- This disables login and clears the password. Idempotent; a no-op if the role is absent.
--
-- BEFORE RUNNING: confirm nothing connects as gdgoc_app (the API's DATABASE_URL user
-- should be the pooler default, e.g. postgres.<project-ref>). If you do use gdgoc_app,
-- skip this file and instead run, with a real secret:
--     ALTER ROLE gdgoc_app PASSWORD '<value from your secret manager>';
--
-- To re-enable the role later (never commit the password):
--     ALTER ROLE gdgoc_app LOGIN PASSWORD '<value from your secret manager>';

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gdgoc_app') THEN
        ALTER ROLE gdgoc_app NOLOGIN PASSWORD NULL;
    END IF;
END $$;
