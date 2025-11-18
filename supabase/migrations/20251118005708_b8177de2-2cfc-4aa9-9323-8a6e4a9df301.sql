-- Step 2: Data Masking & GDPR Compliance (Phase 9 - Week 29-30)

-- Email masking: j***@***.com
CREATE OR REPLACE FUNCTION mask_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF email IS NULL THEN RETURN NULL; END IF;
  
  RETURN substring(email, 1, 1) || 
         repeat('*', 3) || 
         '@' || 
         repeat('*', 3) || 
         '.' || 
         split_part(email, '.', array_length(string_to_array(email, '.'), 1));
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Phone masking: ***-***-1234
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL THEN RETURN NULL; END IF;
  RETURN '***-***-' || substring(phone FROM length(phone) - 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- SSN masking: ***-**-1234
CREATE OR REPLACE FUNCTION mask_ssn(ssn TEXT)
RETURNS TEXT AS $$
BEGIN
  IF ssn IS NULL THEN RETURN NULL; END IF;
  RETURN '***-**-' || substring(ssn FROM length(ssn) - 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Create masked view for admin logs
CREATE OR REPLACE VIEW profiles_masked AS
SELECT 
  id,
  mask_email(email) as email_masked,
  full_name,
  status,
  created_at,
  updated_at
FROM profiles;

-- Grant access to masked view
GRANT SELECT ON profiles_masked TO authenticated;