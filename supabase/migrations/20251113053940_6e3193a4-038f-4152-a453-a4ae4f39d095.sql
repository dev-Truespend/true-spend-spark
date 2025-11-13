-- Fix critical security issue: Remove overly permissive rate limits policy
-- This policy allowed anyone (even unauthenticated users) to read, modify, or delete rate limit records
-- Attackers could disable rate limiting entirely

-- Drop the insecure policy that allows 'true' for all operations
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Note: Edge functions will manage rate limits using the service role key (which bypasses RLS)
-- Users can still view their own rate limits via the existing "Users can view own rate limits" policy
-- No public INSERT/UPDATE/DELETE access is allowed, preventing manipulation

-- Add a comment to document the security model
COMMENT ON TABLE public.rate_limits IS 'Rate limiting data. Managed exclusively by edge functions via service role. Users can only view their own rate limit status.';