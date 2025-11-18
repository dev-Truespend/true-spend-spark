-- Step 3: Backup Monitoring System (Phase 9 - Week 31)

CREATE TABLE IF NOT EXISTS backup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('daily', 'weekly', 'snapshot')),
  backup_timestamp TIMESTAMPTZ NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  verification_status TEXT CHECK (verification_status IN ('verified', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_timestamp ON backup_status(backup_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_status(status, verification_status);

-- Enable RLS
ALTER TABLE backup_status ENABLE ROW LEVEL SECURITY;

-- Only admins can view backup status
CREATE POLICY "Admins can view backup status"
  ON backup_status FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only system can insert backup status (via edge function)
CREATE POLICY "Service role can insert backup status"
  ON backup_status FOR INSERT
  TO service_role
  WITH CHECK (true);