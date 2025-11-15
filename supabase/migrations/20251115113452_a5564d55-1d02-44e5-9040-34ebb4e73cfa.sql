-- Fix handle_new_user() to set Google OAuth users as 'active' immediately
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
  v_existing_user_id UUID;
  v_full_name TEXT;
  v_email_hash TEXT;
  v_initial_status TEXT;
BEGIN
  -- Determine provider
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_provider_user_id := CASE 
    WHEN v_provider = 'google' THEN NEW.raw_user_meta_data->>'sub'
    ELSE NEW.email
  END;

  -- Set initial status based on provider
  -- Google users are pre-verified by Google, email users need verification
  v_initial_status := CASE 
    WHEN v_provider = 'google' THEN 'active'
    ELSE 'pending_verification'
  END;

  -- Extract name fields
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

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

  v_email_hash := public.hash_pii(NEW.email);

  -- Check if user with this email already exists
  SELECT id INTO v_existing_user_id
  FROM profiles
  WHERE email_hash = v_email_hash
  AND status != 'deleted'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- User exists - link the new provider to existing account
    UPDATE profiles
    SET 
      auth_provider = CASE
        WHEN v_provider = 'google' THEN 'google'
        WHEN auth_provider = 'google' THEN 'google'
        ELSE auth_provider
      END,
      first_name_encrypted = CASE 
        WHEN first_name_encrypted IS NULL AND v_first_name != '' AND v_first_name IS NOT NULL
        THEN public.encrypt_pii(v_first_name)
        ELSE first_name_encrypted
      END,
      last_name_encrypted = CASE 
        WHEN last_name_encrypted IS NULL AND v_last_name != '' AND v_last_name IS NOT NULL
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
      email_verified_at = CASE
        WHEN v_provider = 'google' AND email_verified_at IS NULL THEN NOW()
        ELSE email_verified_at
      END,
      updated_at = NOW()
    WHERE id = v_existing_user_id;

    -- Add new auth identity for this provider
    INSERT INTO auth_identities (
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
    -- No existing user - create new profile
    INSERT INTO profiles (
      id, 
      email,
      email_encrypted,
      email_hash,
      full_name,
      first_name_encrypted,
      last_name_encrypted,
      status,
      email_verified_at,
      auth_provider,
      provider_user_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      public.encrypt_pii(NEW.email),
      v_email_hash,
      v_full_name,
      CASE 
        WHEN v_first_name IS NOT NULL AND v_first_name != '' 
        THEN public.encrypt_pii(v_first_name) 
        ELSE NULL 
      END,
      CASE 
        WHEN v_last_name IS NOT NULL AND v_last_name != '' 
        THEN public.encrypt_pii(v_last_name) 
        ELSE NULL 
      END,
      v_initial_status,
      CASE WHEN v_provider = 'google' THEN NOW() ELSE NULL END,
      v_provider,
      v_provider_user_id
    );

    -- Create auth identity record
    INSERT INTO auth_identities (
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
    
    -- Add default user role
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing Google OAuth users who are stuck in pending_verification
UPDATE public.profiles
SET 
  status = 'active',
  email_verified_at = COALESCE(email_verified_at, NOW()),
  updated_at = NOW()
WHERE 
  auth_provider = 'google'
  AND status = 'pending_verification';