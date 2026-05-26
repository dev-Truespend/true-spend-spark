-- Migration: rewards_foundation | Author: Claude | Date: 2026-05-26 | Reversible: yes
-- Adds all tables and columns needed for the AI-powered rewards engine.

-- ── 1. Extend credit_cards with rewards metadata ──────────────────────────────
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_network TEXT;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS card_product_name TEXT;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_type TEXT DEFAULT 'cashback';
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS points_program TEXT;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS base_rewards_rate DECIMAL(5,3) DEFAULT 1.0;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS annual_fee INTEGER DEFAULT 0;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_confirmed_by_user BOOLEAN DEFAULT false;
ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS rewards_last_updated TIMESTAMPTZ;

-- ── 2. card_rewards_categories — per-card, per-category multipliers ───────────
CREATE TABLE IF NOT EXISTS card_rewards_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rewards_rate DECIMAL(5,3) NOT NULL,
  rewards_cap_monthly INTEGER,
  is_rotating_category BOOLEAN DEFAULT false,
  rotating_valid_from DATE,
  rotating_valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(credit_card_id, category)
);
ALTER TABLE card_rewards_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_rewards" ON card_rewards_categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 3. card_catalog — pre-seeded public reference data for 100 US cards ───────
CREATE TABLE IF NOT EXISTS card_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_product_name TEXT NOT NULL UNIQUE,
  card_network TEXT NOT NULL,
  issuer TEXT NOT NULL,
  rewards_type TEXT NOT NULL,
  points_program TEXT,
  annual_fee INTEGER DEFAULT 0,
  base_rewards_rate DECIMAL(5,3) DEFAULT 1.0,
  category_rates JSONB NOT NULL DEFAULT '{}',
  signup_bonus_points INTEGER,
  signup_bonus_spend_required INTEGER,
  signup_bonus_days INTEGER,
  recommended_credit_score_min INTEGER,
  apply_url TEXT,
  apply_url_is_affiliate BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_verified DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT ON card_catalog TO anon, authenticated;

-- ── 4. ai_recommendations — AI-generated recommendation feed ─────────────────
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  credit_card_id UUID REFERENCES credit_cards(id),
  catalog_card_id UUID REFERENCES card_catalog(id),
  transaction_id UUID REFERENCES transactions(id),
  metadata JSONB DEFAULT '{}',
  estimated_value_cents INTEGER,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recs" ON ai_recommendations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_ai_recs_user_status ON ai_recommendations(user_id, status, created_at DESC);

-- ── 5. missed_rewards_summary — monthly rollup ───────────────────────────────
CREATE TABLE IF NOT EXISTS missed_rewards_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  total_rewards_earned_cents INTEGER DEFAULT 0,
  total_rewards_possible_cents INTEGER DEFAULT 0,
  missed_rewards_cents INTEGER DEFAULT 0,
  card_breakdown JSONB DEFAULT '[]',
  category_breakdown JSONB DEFAULT '[]',
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_month)
);
ALTER TABLE missed_rewards_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_summary" ON missed_rewards_summary
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 6. Extend transactions with rewards attribution ───────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rewards_earned_cents INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rewards_possible_cents INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS best_card_id UUID REFERENCES credit_cards(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_category TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_place_id TEXT;

-- ── 7. Helper function for category spending over 90 days ────────────────────
CREATE OR REPLACE FUNCTION get_category_spending_90d(p_user_id UUID)
RETURNS TABLE(category TEXT, total_cents BIGINT) AS $$
  SELECT category, SUM(amount * 100)::BIGINT AS total_cents
  FROM transactions
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '90 days'
    AND amount > 0
  GROUP BY category
  ORDER BY total_cents DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── 8. Card catalog seed — top 50 US credit cards ────────────────────────────
INSERT INTO card_catalog (card_product_name, card_network, issuer, rewards_type, points_program, annual_fee, base_rewards_rate, category_rates, signup_bonus_points, signup_bonus_spend_required, signup_bonus_days, recommended_credit_score_min, apply_url) VALUES
('Amex Gold Card', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 25000, 1.0, '{"dining": 4.0, "groceries": 4.0, "travel": 3.0, "other": 1.0}', 60000, 400000, 180, 700, 'https://americanexpress.com/gold'),
('Chase Sapphire Preferred', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 9500, 1.0, '{"dining": 3.0, "travel": 3.0, "streaming": 3.0, "groceries": 3.0, "other": 1.0}', 60000, 400000, 90, 690, 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred'),
('Chase Sapphire Reserve', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 55000, 1.0, '{"dining": 3.0, "travel": 10.0, "other": 1.0}', 60000, 400000, 90, 720, 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve'),
('Chase Freedom Flex', 'mastercard', 'Chase', 'cashback', NULL, 0, 1.0, '{"dining": 3.0, "drugstore": 3.0, "rotating": 5.0, "other": 1.0}', 20000, 50000, 90, 670, 'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex'),
('Chase Freedom Unlimited', 'visa', 'Chase', 'cashback', NULL, 0, 1.5, '{"dining": 3.0, "drugstore": 3.0, "travel": 5.0, "other": 1.5}', 20000, 50000, 90, 670, 'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited'),
('Capital One Venture X', 'visa', 'Capital One', 'miles', 'Capital One Miles', 39500, 2.0, '{"travel": 10.0, "hotels": 10.0, "other": 2.0}', 75000, 400000, 90, 720, 'https://capitalone.com/venture-x'),
('Capital One Venture', 'visa', 'Capital One', 'miles', 'Capital One Miles', 9500, 2.0, '{"travel": 5.0, "hotels": 5.0, "other": 2.0}', 75000, 400000, 90, 690, 'https://capitalone.com/venture'),
('Capital One Savor', 'mastercard', 'Capital One', 'cashback', NULL, 9500, 1.0, '{"dining": 3.0, "entertainment": 3.0, "groceries": 3.0, "streaming": 3.0, "other": 1.0}', 30000, 300000, 90, 690, 'https://capitalone.com/savor'),
('Capital One SavorOne', 'mastercard', 'Capital One', 'cashback', NULL, 0, 1.0, '{"dining": 3.0, "entertainment": 3.0, "groceries": 3.0, "streaming": 3.0, "other": 1.0}', 20000, 50000, 90, 670, 'https://capitalone.com/savorone'),
('Citi Double Cash', 'mastercard', 'Citi', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 660, 'https://online.citi.com/double-cash'),
('Citi Premier Card', 'mastercard', 'Citi', 'points', 'Citi ThankYou Points', 9500, 1.0, '{"dining": 3.0, "groceries": 3.0, "gas": 3.0, "travel": 3.0, "other": 1.0}', 60000, 400000, 90, 700, 'https://online.citi.com/premier'),
('Citi Custom Cash', 'mastercard', 'Citi', 'cashback', NULL, 0, 1.0, '{"top_category": 5.0, "other": 1.0}', 20000, 150000, 180, 660, 'https://online.citi.com/custom-cash'),
('Amex Blue Cash Preferred', 'amex', 'American Express', 'cashback', NULL, 9500, 1.0, '{"groceries": 6.0, "streaming": 6.0, "transit": 3.0, "gas": 3.0, "other": 1.0}', 25000, 300000, 180, 680, 'https://americanexpress.com/blue-cash-preferred'),
('Amex Blue Cash Everyday', 'amex', 'American Express', 'cashback', NULL, 0, 1.0, '{"groceries": 3.0, "online_retail": 3.0, "gas": 2.0, "other": 1.0}', 20000, 200000, 180, 660, 'https://americanexpress.com/blue-cash-everyday'),
('Amex Platinum', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 69500, 1.0, '{"travel": 5.0, "flights": 5.0, "hotels": 5.0, "other": 1.0}', 80000, 600000, 180, 720, 'https://americanexpress.com/platinum'),
('Amex Business Gold', 'amex', 'American Express', 'points', 'Amex Membership Rewards', 29500, 1.0, '{"top_2_categories": 4.0, "other": 1.0}', 70000, 1000000, 180, 700, 'https://americanexpress.com/business-gold'),
('Discover it Cash Back', 'discover', 'Discover', 'cashback', NULL, 0, 1.0, '{"rotating": 5.0, "other": 1.0}', 0, 0, 0, 650, 'https://discover.com/it-cashback'),
('Discover it Miles', 'discover', 'Discover', 'miles', NULL, 0, 1.5, '{"other": 1.5}', 0, 0, 0, 650, 'https://discover.com/it-miles'),
('Wells Fargo Active Cash', 'visa', 'Wells Fargo', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 20000, 50000, 90, 670, 'https://wellsfargo.com/active-cash'),
('Wells Fargo Autograph', 'visa', 'Wells Fargo', 'points', NULL, 0, 1.0, '{"dining": 3.0, "travel": 3.0, "gas": 3.0, "streaming": 3.0, "transit": 3.0, "other": 1.0}', 20000, 100000, 90, 670, 'https://wellsfargo.com/autograph'),
('Bank of America Customized Cash', 'visa', 'Bank of America', 'cashback', NULL, 0, 1.0, '{"chosen_category": 3.0, "groceries": 2.0, "other": 1.0}', 20000, 100000, 90, 660, 'https://bankofamerica.com/customized-cash'),
('Bank of America Premium Rewards', 'visa', 'Bank of America', 'points', NULL, 9500, 1.5, '{"travel": 2.0, "dining": 2.0, "other": 1.5}', 60000, 400000, 90, 700, 'https://bankofamerica.com/premium-rewards'),
('US Bank Altitude Go', 'visa', 'US Bank', 'points', NULL, 0, 1.0, '{"dining": 4.0, "groceries": 2.0, "streaming": 2.0, "gas": 2.0, "other": 1.0}', 20000, 100000, 90, 660, 'https://usbank.com/altitude-go'),
('US Bank Altitude Connect', 'visa', 'US Bank', 'points', NULL, 9500, 1.0, '{"travel": 4.0, "gas": 4.0, "groceries": 2.0, "streaming": 2.0, "other": 1.0}', 50000, 200000, 120, 690, 'https://usbank.com/altitude-connect'),
('Bilt Mastercard', 'mastercard', 'Wells Fargo', 'points', 'Bilt Rewards', 0, 1.0, '{"rent": 1.0, "dining": 3.0, "travel": 2.0, "other": 1.0}', 0, 0, 0, 680, 'https://biltrewards.com'),
('Ink Business Preferred', 'visa', 'Chase', 'points', 'Chase Ultimate Rewards', 9500, 1.0, '{"travel": 3.0, "shipping": 3.0, "advertising": 3.0, "telecom": 3.0, "other": 1.0}', 100000, 800000, 90, 700, 'https://creditcards.chase.com/business-credit-cards/ink/preferred'),
('Ink Business Cash', 'visa', 'Chase', 'cashback', NULL, 0, 1.0, '{"office_supplies": 5.0, "telecom": 5.0, "dining": 2.0, "gas": 2.0, "other": 1.0}', 90000, 600000, 90, 690, 'https://creditcards.chase.com/business-credit-cards/ink/cash'),
('Ink Business Unlimited', 'visa', 'Chase', 'cashback', NULL, 0, 1.5, '{"other": 1.5}', 90000, 600000, 90, 690, 'https://creditcards.chase.com/business-credit-cards/ink/unlimited'),
('Hilton Honors Amex Surpass', 'amex', 'American Express', 'points', 'Hilton Honors', 15000, 3.0, '{"hilton": 12.0, "dining": 6.0, "groceries": 6.0, "gas": 6.0, "other": 3.0}', 130000, 300000, 90, 680, 'https://americanexpress.com/hilton-surpass'),
('Hilton Honors Amex Card', 'amex', 'American Express', 'points', 'Hilton Honors', 0, 3.0, '{"hilton": 7.0, "dining": 5.0, "groceries": 5.0, "gas": 5.0, "other": 3.0}', 80000, 200000, 90, 660, 'https://americanexpress.com/hilton'),
('Delta SkyMiles Gold Amex', 'amex', 'American Express', 'miles', 'Delta SkyMiles', 9900, 1.0, '{"delta": 3.0, "dining": 2.0, "groceries": 2.0, "other": 1.0}', 70000, 300000, 180, 680, 'https://americanexpress.com/delta-gold'),
('Delta SkyMiles Platinum Amex', 'amex', 'American Express', 'miles', 'Delta SkyMiles', 25000, 1.0, '{"delta": 3.0, "hotels": 3.0, "dining": 2.0, "groceries": 2.0, "other": 1.0}', 85000, 400000, 180, 700, 'https://americanexpress.com/delta-platinum'),
('Southwest Rapid Rewards Plus', 'visa', 'Chase', 'points', 'Southwest Rapid Rewards', 6900, 1.0, '{"southwest": 2.0, "hotels": 2.0, "other": 1.0}', 50000, 100000, 90, 670, 'https://creditcards.chase.com/travel-credit-cards/southwest'),
('Southwest Rapid Rewards Priority', 'visa', 'Chase', 'points', 'Southwest Rapid Rewards', 14900, 1.0, '{"southwest": 3.0, "hotels": 2.0, "other": 1.0}', 50000, 100000, 90, 690, 'https://creditcards.chase.com/travel-credit-cards/southwest-priority'),
('United Explorer Card', 'visa', 'Chase', 'miles', 'United MileagePlus', 9500, 1.0, '{"united": 2.0, "dining": 2.0, "hotels": 2.0, "other": 1.0}', 60000, 300000, 90, 690, 'https://creditcards.chase.com/travel-credit-cards/united'),
('Marriott Bonvoy Boundless', 'visa', 'Chase', 'points', 'Marriott Bonvoy', 9500, 2.0, '{"marriott": 6.0, "dining": 4.0, "groceries": 2.0, "other": 2.0}', 100000, 300000, 90, 690, 'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy-boundless'),
('World of Hyatt Card', 'visa', 'Chase', 'points', 'World of Hyatt', 9500, 1.0, '{"hyatt": 4.0, "dining": 2.0, "fitness": 2.0, "transit": 2.0, "other": 1.0}', 30000, 300000, 90, 690, 'https://creditcards.chase.com/travel-credit-cards/hyatt'),
('Apple Card', 'mastercard', 'Goldman Sachs', 'cashback', NULL, 0, 1.0, '{"apple": 3.0, "other": 2.0}', 0, 0, 0, 670, NULL),
('PayPal Cashback Mastercard', 'mastercard', 'Synchrony', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 650, NULL),
('Amazon Prime Rewards Visa', 'visa', 'Chase', 'cashback', NULL, 0, 1.0, '{"amazon": 5.0, "whole_foods": 5.0, "dining": 2.0, "gas": 2.0, "other": 1.0}', 20000, 0, 0, 670, 'https://amazon.com/prime-rewards'),
('Target RedCard', 'mastercard', 'Target', 'cashback', NULL, 0, 1.0, '{"target": 5.0, "other": 1.0}', 0, 0, 0, 640, 'https://target.com/redcard'),
('Costco Anywhere Visa', 'visa', 'Citi', 'cashback', NULL, 0, 1.0, '{"costco": 2.0, "gas": 4.0, "dining": 3.0, "travel": 3.0, "other": 1.0}', 0, 0, 0, 680, NULL),
('Petal 2 Visa', 'visa', 'WebBank', 'cashback', NULL, 0, 1.0, '{"other": 1.5}', 0, 0, 0, 600, 'https://petalcard.com'),
('Upgrade Cash Rewards Visa', 'visa', 'Sutton Bank', 'cashback', NULL, 0, 1.5, '{"other": 1.5}', 0, 0, 0, 620, 'https://upgrade.com/visa'),
('Robinhood Gold Card', 'mastercard', 'Coastal Community Bank', 'cashback', NULL, 0, 3.0, '{"other": 3.0}', 0, 0, 0, 660, 'https://robinhood.com/gold-card'),
('Fidelity Rewards Visa', 'visa', 'Elan Financial', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 660, 'https://fidelity.com/visa'),
('SoFi Credit Card', 'mastercard', 'Bank of Missouri', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 650, 'https://sofi.com/credit-card'),
('Bread Financial Cashback Amex', 'amex', 'Comenity Capital', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 650, 'https://breadfinancial.com'),
('Alliant Cashback Visa Signature', 'visa', 'Alliant Credit Union', 'cashback', NULL, 9900, 2.5, '{"other": 2.5}', 0, 0, 0, 700, 'https://alliantcreditunion.org'),
('Synchrony Premier World Mastercard', 'mastercard', 'Synchrony', 'cashback', NULL, 0, 2.0, '{"other": 2.0}', 0, 0, 0, 670, 'https://synchrony.com/premier')
ON CONFLICT (card_product_name) DO NOTHING;
