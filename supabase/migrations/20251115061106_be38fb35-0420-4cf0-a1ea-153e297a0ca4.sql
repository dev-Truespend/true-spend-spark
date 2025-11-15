-- Fix remaining functions with missing search_path

-- Fix add_password_to_history function
CREATE OR REPLACE FUNCTION public.add_password_to_history(p_user_id uuid, p_password_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO password_history (user_id, password_hash)
  VALUES (p_user_id, p_password_hash);
  
  DELETE FROM password_history
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT id
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$function$;

-- Fix invalidate_all_user_sessions function
CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO security_logs (
    user_id,
    event_type,
    severity,
    details
  ) VALUES (
    p_user_id,
    'password_changed_sessions_invalidated',
    'info',
    jsonb_build_object('timestamp', NOW())
  );
END;
$function$;

-- Fix cleanup_old_auth_attempts function
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_attempts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_attempts
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix cleanup_old_security_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix update_notification_updated_at function
CREATE OR REPLACE FUNCTION public.update_notification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_provider TEXT;
  v_provider_user_id TEXT;
  v_existing_user_id UUID;
  v_full_name TEXT;
  v_email_hash TEXT;
BEGIN
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_provider_user_id := CASE 
    WHEN v_provider = 'google' THEN NEW.raw_user_meta_data->>'sub'
    ELSE NEW.email
  END;

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

  SELECT id INTO v_existing_user_id
  FROM profiles
  WHERE email_hash = v_email_hash
  AND status != 'deleted'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    UPDATE profiles
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
    INSERT INTO profiles (
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
      NEW.email,
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
    
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix cleanup_expired_push_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_push_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_devices
  WHERE token_expired = true
    AND token_last_verified < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- Fix cleanup_old_notification_logs function
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_delivery_status
  WHERE sent_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- Fix check_budget_thresholds trigger function
CREATE OR REPLACE FUNCTION public.check_budget_thresholds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  budget_record RECORD;
  spent_amount NUMERIC;
  spent_percentage NUMERIC;
BEGIN
  SELECT * INTO budget_record
  FROM budgets
  WHERE (geofence_id = NEW.geofence_id OR category = NEW.category)
    AND user_id = NEW.user_id
    AND active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF budget_record IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM transactions
    WHERE user_id = NEW.user_id
      AND (geofence_id = budget_record.geofence_id OR category = budget_record.category)
      AND timestamp >= budget_record.start_date
      AND (budget_record.end_date IS NULL OR timestamp <= budget_record.end_date);

    spent_percentage := (spent_amount / NULLIF(budget_record.limit_amount, 0)) * 100;

    IF spent_percentage >= 50 AND NOT EXISTS (
      SELECT 1 FROM budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_50'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_50', 50, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 75 AND NOT EXISTS (
      SELECT 1 FROM budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_75'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_75', 75, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 90 AND NOT EXISTS (
      SELECT 1 FROM budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'threshold_90'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'threshold_90', 90, spent_amount, budget_record.limit_amount);
    END IF;

    IF spent_percentage >= 100 AND NOT EXISTS (
      SELECT 1 FROM budget_alerts 
      WHERE budget_id = budget_record.id 
        AND alert_type = 'exceeded'
        AND triggered_at > now() - interval '1 day'
    ) THEN
      INSERT INTO budget_alerts (user_id, budget_id, alert_type, threshold_percentage, current_spent, budget_limit)
      VALUES (NEW.user_id, budget_record.id, 'exceeded', 100, spent_amount, budget_record.limit_amount);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;