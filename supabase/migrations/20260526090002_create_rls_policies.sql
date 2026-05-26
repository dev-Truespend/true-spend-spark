ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_reward_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_update_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users own credit cards" ON public.user_credit_cards;
CREATE POLICY "Users own credit cards"
ON public.user_credit_cards FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users own reward overrides" ON public.user_card_reward_overrides;
CREATE POLICY "Users own reward overrides"
ON public.user_card_reward_overrides FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
CREATE POLICY "Users read own transactions"
ON public.transactions FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own recommendations" ON public.ai_recommendations;
CREATE POLICY "Users read own recommendations"
ON public.ai_recommendations FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own recommendations" ON public.ai_recommendations;
CREATE POLICY "Users update own recommendations"
ON public.ai_recommendations FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own extension events" ON public.extension_events;
CREATE POLICY "Users insert own extension events"
ON public.extension_events FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own extension events" ON public.extension_events;
CREATE POLICY "Users read own extension events"
ON public.extension_events FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users read active verified card catalog" ON public.card_catalog;
CREATE POLICY "Authenticated users read active verified card catalog"
ON public.card_catalog FOR SELECT TO authenticated
USING (is_active = true AND verification_status IN ('verified', 'needs_review'));

DROP POLICY IF EXISTS "Authenticated users read verified reward rules" ON public.card_reward_rules;
CREATE POLICY "Authenticated users read verified reward rules"
ON public.card_reward_rules FOR SELECT TO authenticated
USING (status IN ('verified', 'needs_review'));

DROP POLICY IF EXISTS "Authenticated users read verified merchant domains" ON public.merchant_domains;
CREATE POLICY "Authenticated users read verified merchant domains"
ON public.merchant_domains FOR SELECT TO authenticated
USING (is_verified = true);

DROP POLICY IF EXISTS "Admins read catalog reviews" ON public.catalog_update_reviews;
CREATE POLICY "Admins read catalog reviews"
ON public.catalog_update_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);
