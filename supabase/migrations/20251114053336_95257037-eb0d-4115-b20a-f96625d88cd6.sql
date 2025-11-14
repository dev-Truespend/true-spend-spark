-- Enable Vault extension for encryption
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Create helper function to encrypt TOTP secrets
CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Store secret in Vault and return the ID
  secret_id := vault.create_secret(secret, 'totp-secret');
  RETURN secret_id;
END;
$$;

-- Create helper function to decrypt TOTP secrets
CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decrypted_secret TEXT;
BEGIN
  -- Retrieve secret from Vault
  SELECT decrypted_secret INTO decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_secret;
END;
$$;

-- Add new column for vault reference (temporary during migration)
ALTER TABLE public.mfa_settings
ADD COLUMN IF NOT EXISTS totp_secret_vault_id UUID;

-- Migrate existing TOTP secrets to Vault
DO $$
DECLARE
  mfa_record RECORD;
  vault_id UUID;
BEGIN
  FOR mfa_record IN 
    SELECT user_id, totp_secret 
    FROM public.mfa_settings 
    WHERE totp_secret IS NOT NULL AND totp_secret_vault_id IS NULL
  LOOP
    -- Encrypt existing secret and store vault ID
    vault_id := vault.create_secret(mfa_record.totp_secret, 'totp-secret');
    
    UPDATE public.mfa_settings
    SET totp_secret_vault_id = vault_id
    WHERE user_id = mfa_record.user_id;
  END LOOP;
END;
$$;

-- Drop old plaintext column
ALTER TABLE public.mfa_settings
DROP COLUMN IF EXISTS totp_secret;

-- Rename vault column to totp_secret
ALTER TABLE public.mfa_settings
RENAME COLUMN totp_secret_vault_id TO totp_secret;

-- Add comment for documentation
COMMENT ON COLUMN public.mfa_settings.totp_secret IS 'UUID reference to encrypted TOTP secret in Vault';

-- Create function to safely delete vault secrets when MFA is disabled
CREATE OR REPLACE FUNCTION public.delete_totp_vault_secret(secret_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete secret from Vault
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

-- Log the encryption migration
INSERT INTO security_logs (
  event_type,
  severity,
  details
)
VALUES (
  'totp_encryption_enabled',
  'info',
  jsonb_build_object(
    'timestamp', NOW(),
    'migration', 'Migrated TOTP secrets to Vault encryption'
  )
);