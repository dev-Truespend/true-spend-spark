-- Onboarding state on profiles
--
-- Tracks whether a user has completed (or explicitly skipped) the
-- first-time-user wizard. Users with onboarding_completed_at = NULL
-- get redirected to /onboarding by ProtectedRoute; once they finish
-- (or skip), it's set to NOW() and they're not prompted again.
--
-- Existing users get marked as already-onboarded so we don't shove
-- a wizard at them on next login.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill: any user who already has a transaction, budget, or card
-- has clearly used the product; mark them onboarded so the wizard
-- doesn't ambush them at login.
UPDATE public.profiles p
   SET onboarding_completed_at = NOW()
 WHERE onboarding_completed_at IS NULL
   AND (
     EXISTS (SELECT 1 FROM public.transactions  t WHERE t.user_id = p.id) OR
     EXISTS (SELECT 1 FROM public.budgets       b WHERE b.user_id = p.id) OR
     EXISTS (SELECT 1 FROM public.credit_cards  c WHERE c.user_id = p.id)
   );

-- Index for the redirect lookup
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_pending
  ON public.profiles(id)
  WHERE onboarding_completed_at IS NULL;
