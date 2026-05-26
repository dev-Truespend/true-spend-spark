-- Card catalog extras: signup bonuses, user feedback, and admin rule status tracking.
-- Extends the source-of-truth introduced in 20260526090001_create_source_of_truth_tables.sql.
-- These tables are required by the catalog-extract-card-rewards edge function and the
-- public card-feedback endpoint described in the catalog spec.

-- ── card_signup_bonuses ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.card_signup_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_catalog_id UUID NOT NULL REFERENCES public.card_catalog(id) ON DELETE CASCADE,
  bonus_description TEXT NOT NULL,
  bonus_value_cents INTEGER,
  spend_requirement_cents INTEGER,
  window_days INTEGER,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'verified', 'retired')),
  source_url TEXT,
  extracted_by TEXT DEFAULT 'manual',
  verified_by UUID REFERENCES auth.users(id),
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_signup_bonuses_card_status
  ON public.card_signup_bonuses (card_catalog_id, status);

ALTER TABLE public.card_signup_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read verified signup bonuses" ON public.card_signup_bonuses;
CREATE POLICY "Public read verified signup bonuses"
  ON public.card_signup_bonuses
  FOR SELECT
  USING (status = 'verified');

DROP POLICY IF EXISTS "Admins manage signup bonuses" ON public.card_signup_bonuses;
CREATE POLICY "Admins manage signup bonuses"
  ON public.card_signup_bonuses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── card_user_feedback ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.card_user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_catalog_id UUID REFERENCES public.card_catalog(id) ON DELETE CASCADE,
  card_reward_rule_id UUID REFERENCES public.card_reward_rules(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (
    feedback_type IN ('correct', 'incorrect', 'outdated', 'special_offer', 'other')
  ),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'applied', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_user_feedback_card_status
  ON public.card_user_feedback (card_catalog_id, status);
CREATE INDEX IF NOT EXISTS idx_card_user_feedback_rule_status
  ON public.card_user_feedback (card_reward_rule_id, status);

ALTER TABLE public.card_user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own feedback" ON public.card_user_feedback;
CREATE POLICY "Users see own feedback"
  ON public.card_user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own feedback" ON public.card_user_feedback;
CREATE POLICY "Users insert own feedback"
  ON public.card_user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all feedback" ON public.card_user_feedback;
CREATE POLICY "Admins read all feedback"
  ON public.card_user_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update feedback" ON public.card_user_feedback;
CREATE POLICY "Admins update feedback"
  ON public.card_user_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── card_catalog tracking columns for the refresh cron ───────────────────────
ALTER TABLE public.card_catalog
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_extraction_status TEXT,
  ADD COLUMN IF NOT EXISTS last_extraction_error TEXT,
  ADD COLUMN IF NOT EXISTS last_extraction_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pending_change_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_card_catalog_last_checked
  ON public.card_catalog (last_checked_at NULLS FIRST)
  WHERE verification_status = 'verified';

-- ── catalog_update_reviews: dedupe helper ───────────────────────────────────
-- Used by the diff engine to avoid creating duplicate pending reviews for the
-- same field on the same card.
CREATE INDEX IF NOT EXISTS idx_catalog_update_reviews_card_status_type
  ON public.catalog_update_reviews (card_catalog_id, status, change_type);

-- ── card_reward_rules: per-rule reviewer audit ──────────────────────────────
ALTER TABLE public.card_reward_rules
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
