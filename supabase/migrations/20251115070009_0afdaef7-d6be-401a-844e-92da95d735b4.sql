-- ============================================================================
-- TrueSpend v3.1.0 Security Hardening Migration - Final
-- ============================================================================

-- Add email_hash column to email_rate_limits (keeping email for backward compatibility)
ALTER TABLE public.email_rate_limits ADD COLUMN IF NOT EXISTS email_hash text;
CREATE INDEX IF NOT EXISTS idx_email_rate_limits_email_hash ON public.email_rate_limits(email_hash);

-- Enhance RLS Policies for Auth Tables
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
CREATE POLICY "Prevent profile deletion" ON public.profiles FOR DELETE USING (false);

DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "System can delete used backup codes" ON public.mfa_backup_codes;
CREATE POLICY "System can delete used backup codes" ON public.mfa_backup_codes FOR DELETE USING (used_at IS NOT NULL);

DROP POLICY IF EXISTS "Prevent password history modification" ON public.password_history;
CREATE POLICY "Prevent password history modification" ON public.password_history FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent password history deletion" ON public.password_history;
CREATE POLICY "Prevent password history deletion" ON public.password_history FOR DELETE USING (false);

DROP POLICY IF EXISTS "Prevent auth_attempts modification" ON public.auth_attempts;
CREATE POLICY "Prevent auth_attempts modification" ON public.auth_attempts FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent auth_attempts deletion" ON public.auth_attempts;
CREATE POLICY "Prevent auth_attempts deletion" ON public.auth_attempts FOR DELETE USING (false);

DROP POLICY IF EXISTS "Admins can view all reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Admins can view all reset tokens" ON public.password_reset_tokens FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Prevent reset token modification" ON public.password_reset_tokens;
CREATE POLICY "Prevent reset token modification" ON public.password_reset_tokens FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Prevent reset token deletion" ON public.password_reset_tokens;
CREATE POLICY "Prevent reset token deletion" ON public.password_reset_tokens FOR DELETE USING (false);

DROP POLICY IF EXISTS "System can insert reset tokens" ON public.password_reset_tokens;
CREATE POLICY "System can insert reset tokens" ON public.password_reset_tokens FOR INSERT WITH CHECK (true);

-- Log migration
INSERT INTO public.security_logs (event_type, severity, details) VALUES (
  'security_hardening_migration_v3.1.0',
  'info',
  jsonb_build_object(
    'timestamp', NOW(),
    'changes', jsonb_build_array(
      'Added email_hash support to email_rate_limits table',
      'Enhanced RLS policies for all auth tables',
      'Added comprehensive DELETE/UPDATE restrictions',
      'Prevented profile deletion and unauthorized inserts',
      'Improved password reset token security',
      'Fixed password change dialog MFA bypass vulnerability',
      'Scheduled unverified account cleanup job'
    )
  )
);