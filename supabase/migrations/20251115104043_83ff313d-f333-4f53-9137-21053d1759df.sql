-- Add rate limiting fields to mfa_settings table
ALTER TABLE public.mfa_settings
ADD COLUMN IF NOT EXISTS failed_mfa_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS mfa_lock_until timestamptz,
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_lock_until timestamptz;

-- Create index for lock checks
CREATE INDEX IF NOT EXISTS idx_mfa_settings_locks ON public.mfa_settings(mfa_lock_until, login_lock_until);

-- Update existing records to have 0 failed attempts
UPDATE public.mfa_settings
SET failed_mfa_attempts = 0,
    failed_login_attempts = 0
WHERE failed_mfa_attempts IS NULL;