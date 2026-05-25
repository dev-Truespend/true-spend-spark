-- Subscriptions table for Stripe billing integration
-- Phase 6 — Payment Integration

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro' | 'enterprise'
  status                  TEXT NOT NULL DEFAULT 'trialing', -- Stripe status values
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One subscription row per user
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON subscriptions(user_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages all subscription writes (webhooks use service role key)
CREATE POLICY "service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Helper: check if user is on Pro plan
CREATE OR REPLACE FUNCTION is_pro_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND plan IN ('pro', 'enterprise')
      AND status IN ('active', 'trialing')
  );
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();
