-- Fix security definer view warning by using security_invoker
DROP VIEW IF EXISTS profiles_masked;

CREATE VIEW profiles_masked 
WITH (security_invoker=on)
AS
SELECT 
  id,
  mask_email(email) as email_masked,
  full_name,
  status,
  created_at,
  updated_at
FROM profiles;

GRANT SELECT ON profiles_masked TO authenticated;