-- Stripe webhook idempotency
-- Phase 6 — Payment hardening
--
-- Stripe retries webhook deliveries until it gets a 2xx response,
-- so the same event ID can hit us multiple times. Without idempotency,
-- we could:
--   • upsert a subscription twice (harmless but noisy)
--   • re-send the "payment failed" email multiple times
--   • double-process invoice events if they ever trigger side effects
--
-- We insert the event_id with an EXCLUDE-by-uniqueness check at the
-- top of the webhook handler. If the insert succeeds we process; if
-- it conflicts we ack the duplicate and return 200.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id        TEXT PRIMARY KEY,           -- Stripe's evt_xxx
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash    TEXT,                       -- SHA-256 of the body, helps debugging replays
  outcome         TEXT NOT NULL DEFAULT 'success' -- 'success' | 'error' | 'skipped'
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON stripe_webhook_events(processed_at DESC);

-- Only the service role writes here (the webhook function uses it).
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages stripe_webhook_events"
  ON stripe_webhook_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Helper: garbage-collect events older than 90 days (Stripe's retry window
-- is at most 3 days, so anything older is purely historical).
CREATE OR REPLACE FUNCTION purge_old_stripe_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stripe_webhook_events
   WHERE processed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
