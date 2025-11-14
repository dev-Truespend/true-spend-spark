-- Drop test email verification infrastructure
-- This migration removes all test code for email verification

-- Drop the index first
DROP INDEX IF EXISTS public.idx_test_email_codes_email_expires;

-- Drop the cleanup function
DROP FUNCTION IF EXISTS public.cleanup_expired_test_codes();

-- Drop the test email codes table
DROP TABLE IF EXISTS public.test_email_codes;