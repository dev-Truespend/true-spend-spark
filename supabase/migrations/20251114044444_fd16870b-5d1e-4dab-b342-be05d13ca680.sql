-- Phase 1: Unified Authentication & Account Linking

-- Step 1: Update auth_identities constraints to allow multiple providers per user
ALTER TABLE public.auth_identities 
DROP CONSTRAINT IF EXISTS auth_identities_user_id_key;

ALTER TABLE public.auth_identities 
ADD CONSTRAINT auth_identities_user_id_provider_key 
UNIQUE (user_id, provider);

CREATE INDEX IF NOT EXISTS idx_auth_identities_provider_user_id 
ON public.auth_identities(provider, provider_user_id);

-- Step 2: Update handle_new_user trigger with account linking logic
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

  -- CHECK FOR EXISTING ACCOUNT WITH SAME EMAIL
  SELECT id INTO v_existing_user_id
  FROM public.profiles
  WHERE email = NEW.email
  AND status != 'deleted'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- ACCOUNT LINKING: Email already exists, link new provider
    
    -- Update existing profile
    UPDATE public.profiles
    SET 
      auth_provider = CASE
        WHEN v_provider = 'google' THEN 'google'  -- Google takes precedence
        WHEN auth_provider = 'google' THEN 'google'  -- Keep Google as primary
        ELSE auth_provider
      END,
      first_name = CASE 
        WHEN (first_name IS NULL OR first_name = '') AND v_first_name != '' 
        THEN v_first_name 
        ELSE first_name 
      END,
      last_name = CASE 
        WHEN (last_name IS NULL OR last_name = '') AND v_last_name != '' 
        THEN v_last_name 
        ELSE last_name 
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
    -- NEW USER: Create profile
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
      v_full_name,
      v_first_name,
      v_last_name,
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

-- Step 3: Migrate existing Google users with empty names
UPDATE public.profiles
SET 
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1 
    THEN SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2)
    ELSE ''
  END
WHERE 
  auth_provider = 'google' 
  AND (first_name IS NULL OR first_name = '')
  AND full_name IS NOT NULL 
  AND full_name != '';