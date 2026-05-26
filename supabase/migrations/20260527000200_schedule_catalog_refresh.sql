-- Schedule the catalog-refresh-cron Edge Function via pg_cron + pg_net.
-- Runs once a day at 09:00 UTC; the function itself enforces the 15-day
-- interval per card so daily invocations are safe and idempotent.
--
-- Prerequisites set elsewhere:
--   - Supabase Vault secrets:
--       app.settings.supabase_url        = https://<project>.supabase.co
--       app.settings.catalog_cron_secret = matches CRON_SECRET env var
--   - Edge Function env vars:
--       ANTHROPIC_API_KEY
--       CRON_SECRET
--       CATALOG_REFRESH_ADMIN_TOKEN (a JWT for a profiles.role='admin' user)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_jobid BIGINT;
BEGIN
  SELECT jobid INTO existing_jobid
  FROM cron.job
  WHERE jobname = 'catalog-refresh-cron';

  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;

  PERFORM cron.schedule(
    'catalog-refresh-cron',
    '0 9 * * *',
    $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/catalog-refresh-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.settings.catalog_cron_secret', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
    $cron$
  );
END $$;
