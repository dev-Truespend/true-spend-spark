-- Source of truth foundation for the rewards MVP.
-- This migration is additive because older migrations already created parts of
-- the rewards prototype with different column names.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.card_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_catalog
  ADD COLUMN IF NOT EXISTS card_name TEXT,
  ADD COLUMN IF NOT EXISTS card_slug TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS rewards_currency TEXT,
  ADD COLUMN IF NOT EXISTS rewards_program TEXT,
  ADD COLUMN IF NOT EXISTS annual_fee_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS foreign_transaction_fee BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_reward_rate NUMERIC(8,3) DEFAULT 1.000,
  ADD COLUMN IF NOT EXISTS base_reward_unit TEXT DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS recommended_credit_score_min INTEGER,
  ADD COLUMN IF NOT EXISTS official_product_url TEXT,
  ADD COLUMN IF NOT EXISTS official_terms_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'card_catalog'
      AND column_name = 'card_product_name'
  ) THEN
    EXECUTE $sql$
      UPDATE public.card_catalog
      SET
        card_name = COALESCE(card_name, card_product_name, issuer || ' card'),
        card_slug = COALESCE(
          card_slug,
          lower(regexp_replace(regexp_replace(COALESCE(card_product_name, issuer || '-' || id::text), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
        )
      WHERE card_name IS NULL OR card_slug IS NULL
    $sql$;
  ELSE
    UPDATE public.card_catalog
    SET
      card_name = COALESCE(card_name, issuer || ' card'),
      card_slug = COALESCE(
        card_slug,
        lower(regexp_replace(regexp_replace(issuer || '-' || id::text, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
      )
    WHERE card_name IS NULL OR card_slug IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'card_network') THEN
    EXECUTE 'UPDATE public.card_catalog SET network = COALESCE(network, card_network, ''other'') WHERE network IS NULL';
  ELSE
    UPDATE public.card_catalog SET network = COALESCE(network, 'other') WHERE network IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'rewards_type') THEN
    EXECUTE 'UPDATE public.card_catalog SET rewards_currency = COALESCE(rewards_currency, rewards_type, ''cashback'') WHERE rewards_currency IS NULL';
  ELSE
    UPDATE public.card_catalog SET rewards_currency = COALESCE(rewards_currency, 'cashback') WHERE rewards_currency IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'points_program') THEN
    EXECUTE 'UPDATE public.card_catalog SET rewards_program = COALESCE(rewards_program, points_program) WHERE rewards_program IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'annual_fee') THEN
    EXECUTE 'UPDATE public.card_catalog SET annual_fee_cents = COALESCE(annual_fee_cents, annual_fee, 0) WHERE annual_fee_cents IS NULL';
  ELSE
    UPDATE public.card_catalog SET annual_fee_cents = COALESCE(annual_fee_cents, 0) WHERE annual_fee_cents IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'base_rewards_rate') THEN
    EXECUTE 'UPDATE public.card_catalog SET base_reward_rate = COALESCE(base_reward_rate, base_rewards_rate, 1.000) WHERE base_reward_rate IS NULL';
  ELSE
    UPDATE public.card_catalog SET base_reward_rate = COALESCE(base_reward_rate, 1.000) WHERE base_reward_rate IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'apply_url') THEN
    EXECUTE 'UPDATE public.card_catalog SET official_product_url = COALESCE(official_product_url, apply_url) WHERE official_product_url IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'card_catalog' AND column_name = 'last_verified') THEN
    EXECUTE 'UPDATE public.card_catalog SET last_verified_at = COALESCE(last_verified_at, last_verified::timestamptz) WHERE last_verified_at IS NULL';
  END IF;

  UPDATE public.card_catalog
  SET verification_status = COALESCE(verification_status, 'needs_review')
  WHERE verification_status IS NULL;
END $$;

ALTER TABLE public.card_catalog
  ALTER COLUMN card_name SET NOT NULL,
  ALTER COLUMN card_slug SET NOT NULL,
  ALTER COLUMN card_type SET DEFAULT 'personal',
  ALTER COLUMN annual_fee_cents SET DEFAULT 0,
  ALTER COLUMN foreign_transaction_fee SET DEFAULT false,
  ALTER COLUMN base_reward_rate SET DEFAULT 1.000,
  ALTER COLUMN base_reward_unit SET DEFAULT 'percent',
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN verification_status SET DEFAULT 'needs_review';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'card_catalog_network_check'
      AND conrelid = 'public.card_catalog'::regclass
  ) THEN
    ALTER TABLE public.card_catalog
      ADD CONSTRAINT card_catalog_network_check
      CHECK (network IN ('visa', 'mastercard', 'amex', 'discover', 'other') OR network IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'card_catalog_card_type_check'
      AND conrelid = 'public.card_catalog'::regclass
  ) THEN
    ALTER TABLE public.card_catalog
      ADD CONSTRAINT card_catalog_card_type_check
      CHECK (card_type IN ('personal', 'business'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'card_catalog_rewards_currency_check'
      AND conrelid = 'public.card_catalog'::regclass
  ) THEN
    ALTER TABLE public.card_catalog
      ADD CONSTRAINT card_catalog_rewards_currency_check
      CHECK (rewards_currency IN ('cashback', 'points', 'miles', 'none') OR rewards_currency IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'card_catalog_base_reward_unit_check'
      AND conrelid = 'public.card_catalog'::regclass
  ) THEN
    ALTER TABLE public.card_catalog
      ADD CONSTRAINT card_catalog_base_reward_unit_check
      CHECK (base_reward_unit IN ('percent', 'points_per_dollar', 'miles_per_dollar'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'card_catalog_verification_status_check'
      AND conrelid = 'public.card_catalog'::regclass
  ) THEN
    ALTER TABLE public.card_catalog
      ADD CONSTRAINT card_catalog_verification_status_check
      CHECK (verification_status IN ('unverified', 'needs_review', 'verified', 'deprecated'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.card_reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_catalog_id UUID NOT NULL REFERENCES public.card_catalog(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  reward_rate NUMERIC(8,3) NOT NULL,
  reward_unit TEXT NOT NULL CHECK (reward_unit IN ('percent', 'points_per_dollar', 'miles_per_dollar')),
  applies_to TEXT,
  merchant_scope TEXT DEFAULT 'all',
  cap_amount_cents INTEGER,
  cap_period TEXT CHECK (cap_period IN ('monthly', 'quarterly', 'yearly', 'lifetime', 'none') OR cap_period IS NULL),
  after_cap_rate NUMERIC(8,3),
  requires_activation BOOLEAN DEFAULT false,
  valid_from DATE,
  valid_until DATE,
  exclusion_notes TEXT,
  source_url TEXT NOT NULL,
  confidence_score NUMERIC(5,2) DEFAULT 0.90,
  status TEXT DEFAULT 'verified' CHECK (status IN ('draft', 'proposed', 'verified', 'needs_review', 'retired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(card_catalog_id, category, merchant_scope, valid_from)
);

CREATE TABLE IF NOT EXISTS public.user_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_catalog_id UUID REFERENCES public.card_catalog(id),
  display_name TEXT NOT NULL,
  issuer TEXT,
  network TEXT,
  last4 TEXT,
  is_active BOOLEAN DEFAULT true,
  rewards_confirmed_by_user BOOLEAN DEFAULT false,
  plaid_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_card_reward_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_credit_card_id UUID NOT NULL REFERENCES public.user_credit_cards(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  reward_rate NUMERIC(8,3) NOT NULL,
  reward_unit TEXT NOT NULL CHECK (reward_unit IN ('percent', 'points_per_dollar', 'miles_per_dollar')),
  applies_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_credit_card_id, category)
);

CREATE TABLE IF NOT EXISTS public.merchant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  merchant_name TEXT NOT NULL,
  normalized_category TEXT NOT NULL,
  subcategory TEXT,
  confidence_score NUMERIC(5,2) DEFAULT 0.90,
  detection_source TEXT DEFAULT 'manual' CHECK (detection_source IN ('manual', 'ai', 'plaid', 'google_places', 'user_report', 'seed')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS normalized_category TEXT,
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS authorized_date DATE,
  ADD COLUMN IF NOT EXISTS user_credit_card_id UUID REFERENCES public.user_credit_cards(id),
  ADD COLUMN IF NOT EXISTS best_user_credit_card_id UUID REFERENCES public.user_credit_cards(id),
  ADD COLUMN IF NOT EXISTS rewards_earned_cents INTEGER,
  ADD COLUMN IF NOT EXISTS rewards_possible_cents INTEGER,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'amount') THEN
    EXECUTE 'UPDATE public.transactions SET amount_cents = COALESCE(amount_cents, ROUND(amount * 100)::integer) WHERE amount_cents IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'category') THEN
    EXECUTE 'UPDATE public.transactions SET normalized_category = COALESCE(normalized_category, lower(category)) WHERE normalized_category IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'timestamp') THEN
    EXECUTE 'UPDATE public.transactions SET transaction_date = COALESCE(transaction_date, timestamp::date) WHERE transaction_date IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  user_credit_card_id UUID REFERENCES public.user_credit_cards(id),
  catalog_card_id UUID REFERENCES public.card_catalog(id),
  transaction_id UUID REFERENCES public.transactions(id),
  estimated_value_cents INTEGER,
  confidence_score NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'actioned', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_recommendations
  ADD COLUMN IF NOT EXISTS user_credit_card_id UUID REFERENCES public.user_credit_cards(id),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS public.catalog_update_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_catalog_id UUID REFERENCES public.card_catalog(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB NOT NULL,
  source_url TEXT,
  detected_by TEXT DEFAULT 'manual' CHECK (detected_by IN ('manual', 'ai_agent', 'admin', 'system')),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extension_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  merchant_name TEXT,
  normalized_category TEXT,
  event_type TEXT NOT NULL,
  recommendation_id UUID REFERENCES public.ai_recommendations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
