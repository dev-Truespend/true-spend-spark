-- Fix migrate_existing_pii_to_encrypted function
CREATE OR REPLACE FUNCTION public.migrate_existing_pii_to_encrypted()
RETURNS TABLE(migrated_count integer, error_count integer, errors jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_migrated INTEGER := 0;
  v_errors INTEGER := 0;
  v_error_log JSONB := '[]'::JSONB;
BEGIN
  FOR v_profile IN 
    SELECT id, email, phone, first_name, last_name, pending_new_email
    FROM profiles
    WHERE email_encrypted IS NULL
  LOOP
    BEGIN
      IF v_profile.email IS NOT NULL THEN
        UPDATE profiles
        SET 
          email_encrypted = public.encrypt_pii(v_profile.email),
          email_hash = public.hash_pii(v_profile.email)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.phone IS NOT NULL THEN
        UPDATE profiles
        SET 
          phone_encrypted = public.encrypt_pii(v_profile.phone),
          phone_hash = public.hash_pii(v_profile.phone)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.first_name IS NOT NULL THEN
        UPDATE profiles
        SET first_name_encrypted = public.encrypt_pii(v_profile.first_name)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.last_name IS NOT NULL THEN
        UPDATE profiles
        SET last_name_encrypted = public.encrypt_pii(v_profile.last_name)
        WHERE id = v_profile.id;
      END IF;

      IF v_profile.pending_new_email IS NOT NULL THEN
        UPDATE profiles
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
$function$;