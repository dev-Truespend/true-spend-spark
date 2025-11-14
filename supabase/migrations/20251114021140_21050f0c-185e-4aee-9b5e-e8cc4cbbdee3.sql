-- Create MFA settings table to store TOTP secrets
CREATE TABLE public.mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  totp_secret TEXT NOT NULL,
  totp_enabled BOOLEAN DEFAULT false,
  backup_codes_generated BOOLEAN DEFAULT false,
  enabled_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create MFA backup codes table
CREATE TABLE public.mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_mfa_settings_user_id ON public.mfa_settings(user_id);
CREATE INDEX idx_mfa_backup_codes_user_id ON public.mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_unused ON public.mfa_backup_codes(user_id) WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mfa_settings
CREATE POLICY "Users can view own MFA settings"
  ON public.mfa_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own MFA settings"
  ON public.mfa_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for mfa_backup_codes
CREATE POLICY "Users can view own backup codes"
  ON public.mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage backup codes"
  ON public.mfa_backup_codes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_mfa_settings_updated_at
  BEFORE UPDATE ON public.mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();