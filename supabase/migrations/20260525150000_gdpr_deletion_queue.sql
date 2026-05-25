-- GDPR / Right-to-Erasure deletion queue
--
-- The `delete-account` Edge Function does a SOFT delete (sets
-- profiles.status = 'deleted' and wipes PII fields), then queues the
-- user_id here for HARD deletion after a 30-day grace period.
--
-- A separate cron job (`gdpr-purge-deleted-accounts`) reads rows where
-- `purge_after <= NOW()` and calls auth.admin.deleteUser() — which
-- cascades through the foreign keys and removes everything.
--
-- The 30-day grace period exists so users who request deletion in
-- anger can recover their account by contacting support.

CREATE TABLE IF NOT EXISTS gdpr_deletion_queue (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purge_after  TIMESTAMPTZ NOT NULL,
  purged_at    TIMESTAMPTZ,             -- set when the cron runs the hard delete
  purge_error  TEXT,                    -- last error from the cron, if any
  attempts     INTEGER NOT NULL DEFAULT 0
);

-- Index for the cron-job query: pending rows past the grace period.
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_queue_pending
  ON gdpr_deletion_queue(purge_after)
  WHERE purged_at IS NULL;

-- Service role manages all writes (the Edge Function uses it)
ALTER TABLE gdpr_deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages gdpr_deletion_queue"
  ON gdpr_deletion_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users may SELECT their own row so the UI can show "scheduled for
-- deletion on YYYY-MM-DD" until the purge.
CREATE POLICY "users read own deletion queue row"
  ON gdpr_deletion_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Helper: returns true if the user has a pending deletion (within grace).
CREATE OR REPLACE FUNCTION is_account_pending_deletion(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gdpr_deletion_queue
    WHERE user_id = p_user_id
      AND purged_at IS NULL
      AND purge_after > NOW()
  );
$$;
