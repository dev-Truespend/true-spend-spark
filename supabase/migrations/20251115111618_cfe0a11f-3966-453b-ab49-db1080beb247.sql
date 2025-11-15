-- Add pending_mfa_secret field for MFA setup in progress
ALTER TABLE mfa_settings 
ADD COLUMN IF NOT EXISTS pending_mfa_secret uuid REFERENCES vault.secrets(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN mfa_settings.pending_mfa_secret IS 
  'Temporary TOTP secret during MFA setup, cleared on cancel or successful enable';

-- Add index for faster lookups during setup
CREATE INDEX IF NOT EXISTS idx_mfa_settings_pending_secret 
ON mfa_settings(user_id, pending_mfa_secret) 
WHERE pending_mfa_secret IS NOT NULL;