-- ==========================================
-- CRITICAL PII ENCRYPTION IMPLEMENTATION
-- ==========================================
-- This migration adds Supabase Vault encryption for sensitive PII fields
-- while maintaining searchability through hashing

-- 1. CREATE ENCRYPTION/DECRYPTION FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.encrypt_pii(data TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Store PII in Vault and return the secret ID
  secret_id := vault.create_secret(data, 'pii-data');
  RETURN secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_data TEXT;
BEGIN
  -- Retrieve PII from Vault
  SELECT decrypted_secret INTO decrypted_data
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_data;
END;
$$;

-- 2. CREATE HASHING FUNCTION FOR SEARCHABLE FIELDS
-- ==========================================

CREATE OR REPLACE FUNCTION public.hash_pii(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Create deterministic hash for lookups
  RETURN encode(digest(lower(trim(data)) || 'truespend_salt_2024', 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_ip(ip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Hash IP addresses for privacy
  RETURN encode(digest(ip || 'truespend_ip_salt_2024', 'sha256'), 'hex');
END;
$$;

-- 3. ADD ENCRYPTED COLUMNS TO PROFILES TABLE
-- ==========================================

ALTER TABLE public.profiles
ADD COLUMN email_encrypted UUID REFERENCES vault.secrets(id),
ADD COLUMN email_hash TEXT UNIQUE,
ADD COLUMN phone_encrypted UUID REFERENCES vault.secrets(id),
ADD COLUMN phone_hash TEXT,
ADD COLUMN first_name_encrypted UUID REFERENCES vault.secrets(id),
ADD COLUMN last_name_encrypted UUID REFERENCES vault.secrets(id),
ADD COLUMN pending_new_email_encrypted UUID REFERENCES vault.secrets(id),
ADD COLUMN pending_new_email_hash TEXT;

-- Create indexes for fast lookups
CREATE INDEX idx_profiles_email_hash ON public.profiles(email_hash);
CREATE INDEX idx_profiles_phone_hash ON public.profiles(phone_hash) WHERE phone_hash IS NOT NULL;

-- 4. ADD HASHED IP COLUMNS TO SECURITY TABLES
-- ==========================================

ALTER TABLE public.auth_attempts
ADD COLUMN ip_address_hash TEXT;

ALTER TABLE public.security_logs
ADD COLUMN ip_address_hash TEXT;

ALTER TABLE public.password_reset_tokens
ADD COLUMN ip_address_hash TEXT;

-- Create indexes for IP hash lookups
CREATE INDEX idx_auth_attempts_ip_hash ON public.auth_attempts(ip_address_hash) WHERE ip_address_hash IS NOT NULL;
CREATE INDEX idx_security_logs_ip_hash ON public.security_logs(ip_address_hash) WHERE ip_address_hash IS NOT NULL;

-- 5. CREATE DATA MIGRATION FUNCTION (to be run post-deployment)
-- ==========================================

CREATE OR REPLACE FUNCTION public.migrate_existing_pii_to_encrypted()
RETURNS TABLE(
  migrated_count INTEGER,
  error_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_migrated INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_log JSONB := '[]'::JSONB;
BEGIN
  -- Migrate existing plaintext data to encrypted format
  FOR v_profile IN 
    SELECT id, email, phone, first_name, last_name, pending_new_email
    FROM public.profiles
    WHERE email_encrypted IS NULL -- Only migrate non-encrypted records
  LOOP
    BEGIN
      -- Encrypt and hash email
      IF v_profile.email IS NOT NULL THEN
        UPDATE public.profiles
        SET 
          email_encrypted = public.encrypt_pii(v_profile.email),
          email_hash = public.hash_pii(v_profile.email)
        WHERE id = v_profile.id;
      END IF;

      -- Encrypt and hash phone
      IF v_profile.phone IS NOT NULL THEN
        UPDATE public.profiles
        SET 
          phone_encrypted = public.encrypt_pii(v_profile.phone),
          phone_hash = public.hash_pii(v_profile.phone)
        WHERE id = v_profile.id;
      END IF;

      -- Encrypt first_name
      IF v_profile.first_name IS NOT NULL THEN
        UPDATE public.profiles
        SET first_name_encrypted = public.encrypt_pii(v_profile.first_name)
        WHERE id = v_profile.id;
      END IF;

      -- Encrypt last_name
      IF v_profile.last_name IS NOT NULL THEN
        UPDATE public.profiles
        SET last_name_encrypted = public.encrypt_pii(v_profile.last_name)
        WHERE id = v_profile.id;
      END IF;

      -- Encrypt pending_new_email
      IF v_profile.pending_new_email IS NOT NULL THEN
        UPDATE public.profiles
        SET 
          pending_new_email_encrypted = public.encrypt_pii(v_profile.pending_new_email),
          pending_new_email_hash = public.hash_pii(v_profile.pending_new_email)
        WHERE id = v_profile.id;
      END IF;

      v_migrated := v_migrated + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_log := v_error_log || jsonb_build_object(
        'user_id', v_profile.id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_migrated, v_errors, v_error_log;
END;
$$;

-- 6. UPDATE HANDLE_NEW_USER TRIGGER TO USE ENCRYPTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_provider TEXT;
  v_provider_user_id TEXT;
  v_existing_user_id UUID;
  v_full_name TEXT;
  v_email_hash TEXT;
BEGIN
  -- Extract provider
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_provider_user_id := CASE 
    WHEN v_provider = 'google' THEN NEW.raw_user_meta_data->>'sub'
    ELSE NEW.email
  END;

  -- Extract full_name from metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- Parse first/last name from full_name if not provided
  IF v_full_name != '' AND 
     (NEW.raw_user_meta_data->>'first_name' IS NULL OR 
      NEW.raw_user_meta_data->>'given_name' IS NULL) THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN ARRAY_LENGTH(STRING_TO_ARRAY(v_full_name, ' '), 1) > 1 
      THEN SUBSTRING(v_full_name FROM LENGTH(v_first_name) + 2)
      ELSE ''
    END;
  ELSE
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
  END IF;

  -- Create email hash for lookup
  v_email_hash := public.hash_pii(NEW.email);

  -- CHECK FOR EXISTING ACCOUNT WITH SAME EMAIL HASH
  SELECT id INTO v_existing_user_id
  FROM public.profiles
  WHERE email_hash = v_email_hash
  AND status != 'deleted'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- ACCOUNT LINKING: Email already exists, link new provider
    
    -- Update existing profile (decrypt/encrypt names if needed)
    UPDATE public.profiles
    SET 
      auth_provider = CASE
        WHEN v_provider = 'google' THEN 'google'
        WHEN auth_provider = 'google' THEN 'google'
        ELSE auth_provider
      END,
      first_name_encrypted = CASE 
        WHEN first_name_encrypted IS NULL AND v_first_name != '' 
        THEN public.encrypt_pii(v_first_name)
        ELSE first_name_encrypted
      END,
      last_name_encrypted = CASE 
        WHEN last_name_encrypted IS NULL AND v_last_name != '' 
        THEN public.encrypt_pii(v_last_name)
        ELSE last_name_encrypted
      END,
      full_name = CASE 
        WHEN (full_name IS NULL OR full_name = '') AND v_full_name != '' 
        THEN v_full_name 
        ELSE full_name 
      END,
      status = CASE 
        WHEN v_provider = 'google' AND status = 'pending_verification' THEN 'active'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_existing_user_id;

    -- Add new identity
    INSERT INTO public.auth_identities (
      user_id,
      provider,
      provider_user_id,
      last_sign_in_at
    )
    VALUES (
      v_existing_user_id,
      v_provider,
      v_provider_user_id,
      NOW()
    )
    ON CONFLICT (user_id, provider) DO UPDATE
    SET 
      last_sign_in_at = NOW(),
      provider_user_id = EXCLUDED.provider_user_id;

  ELSE
    -- NEW USER: Create profile with encrypted PII
    INSERT INTO public.profiles (
      id, 
      email,
      email_encrypted,
      email_hash,
      full_name,
      first_name_encrypted,
      last_name_encrypted,
      status,
      auth_provider,
      provider_user_id
    )
    VALUES (
      NEW.id,
      NEW.email, -- Keep plaintext temporarily for migration
      public.encrypt_pii(NEW.email),
      v_email_hash,
      v_full_name,
      CASE WHEN v_first_name != '' THEN public.encrypt_pii(v_first_name) ELSE NULL END,
      CASE WHEN v_last_name != '' THEN public.encrypt_pii(v_last_name) ELSE NULL END,
      CASE 
        WHEN v_provider = 'google' THEN 'active'
        ELSE 'pending_verification'
      END,
      v_provider,
      v_provider_user_id
    );

    -- Insert auth identity
    INSERT INTO public.auth_identities (
      user_id,
      provider,
      provider_user_id,
      last_sign_in_at
    )
    VALUES (
      NEW.id,
      v_provider,
      v_provider_user_id,
      NOW()
    );
    
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. ADD HELPER FUNCTION TO GET DECRYPTED PROFILE
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_decrypted_profile(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  pending_new_email TEXT,
  status TEXT,
  auth_provider TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(public.decrypt_pii(p.email_encrypted), p.email) as email,
    public.decrypt_pii(p.phone_encrypted) as phone,
    public.decrypt_pii(p.first_name_encrypted) as first_name,
    public.decrypt_pii(p.last_name_encrypted) as last_name,
    p.full_name,
    public.decrypt_pii(p.pending_new_email_encrypted) as pending_new_email,
    p.status,
    p.auth_provider,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.encrypt_pii IS 'Encrypts sensitive PII data using Supabase Vault';
COMMENT ON FUNCTION public.decrypt_pii IS 'Decrypts PII data from Supabase Vault';
COMMENT ON FUNCTION public.hash_pii IS 'Creates searchable hash for PII fields';
COMMENT ON FUNCTION public.hash_ip IS 'Hashes IP addresses for privacy compliance';
COMMENT ON FUNCTION public.get_decrypted_profile IS 'Returns decrypted profile data for authenticated user';