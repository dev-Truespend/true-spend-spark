-- PHASE 1: DROP OLD OTP SYSTEM
DROP TABLE IF EXISTS public.mfa_email_codes CASCADE;

-- Remove mfa_email_enabled from user_roles
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS mfa_email_enabled;

-- PHASE 2: ALTER PROFILES TABLE
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification', 'active', 'deleted')),
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email'
    CHECK (auth_provider IN ('email', 'google')),
  ADD COLUMN IF NOT EXISTS provider_user_id TEXT,
  ADD COLUMN IF NOT EXISTS pending_new_email TEXT,
  ADD COLUMN IF NOT EXISTS email_change_token TEXT,
  ADD COLUMN IF NOT EXISTS email_change_expires_at TIMESTAMPTZ;

-- Create indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_token ON public.profiles(verification_token);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_expires_at ON public.profiles(verification_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_provider_user_id ON public.profiles(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email_change_token ON public.profiles(email_change_token);

-- Update existing profiles to 'active' status
UPDATE public.profiles SET status = 'active' WHERE status IS NULL OR status = 'pending_verification';

-- PHASE 3: CREATE PREVIOUS_EMAILS TABLE
CREATE TABLE IF NOT EXISTS public.previous_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  replaced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_previous_emails_user_id ON public.previous_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_previous_emails_email ON public.previous_emails(email);

-- Enable RLS on previous_emails
ALTER TABLE public.previous_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for previous_emails
CREATE POLICY "Users can view own previous emails"
  ON public.previous_emails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all previous emails"
  ON public.previous_emails
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert previous emails"
  ON public.previous_emails
  FOR INSERT
  WITH CHECK (true);

-- PHASE 4: CREATE AUTH_IDENTITIES TABLE
CREATE TABLE IF NOT EXISTS public.auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google')),
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON public.auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_provider_user_id ON public.auth_identities(provider, provider_user_id);

-- Enable RLS on auth_identities
ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;

-- RLS policies for auth_identities
CREATE POLICY "Users can view own identities"
  ON public.auth_identities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all identities"
  ON public.auth_identities
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage identities"
  ON public.auth_identities
  FOR ALL
  WITH CHECK (true);

-- PHASE 5: UPDATE HANDLE_NEW_USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_provider TEXT;
  v_provider_user_id TEXT;
BEGIN
  -- Extract provider
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_provider_user_id := CASE 
    WHEN v_provider = 'google' THEN NEW.raw_user_meta_data->>'sub'
    ELSE NEW.email
  END;

  -- Extract names from metadata
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'given_name',
    ''
  );
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'family_name',
    ''
  );

  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    first_name, 
    last_name,
    status,
    auth_provider,
    provider_user_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    v_first_name,
    v_last_name,
    'pending_verification',
    v_provider,
    v_provider_user_id
  );

  -- Insert auth identity
  INSERT INTO public.auth_identities (
    user_id,
    provider,
    provider_user_id
  )
  VALUES (
    NEW.id,
    v_provider,
    v_provider_user_id
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- PHASE 6: CREATE CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION public.cleanup_unverified_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Soft delete accounts with expired verification
  UPDATE profiles
  SET 
    status = 'deleted',
    deleted_at = NOW()
  WHERE 
    status = 'pending_verification'
    AND verification_expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log to security_logs
  INSERT INTO security_logs (
    event_type,
    severity,
    details
  )
  VALUES (
    'auto_delete_unverified_accounts',
    'info',
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$;