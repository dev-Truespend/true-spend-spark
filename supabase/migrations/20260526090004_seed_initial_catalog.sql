WITH cards(issuer, card_name, card_slug, network, rewards_currency, rewards_program, annual_fee_cents, base_reward_rate, base_reward_unit, official_product_url) AS (
  VALUES
    ('American Express','Amex Gold','amex-gold','amex','points','Membership Rewards',25000,1.000,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/gold-card/'),
    ('American Express','Amex Platinum','amex-platinum','amex','points','Membership Rewards',69500,1.000,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/platinum/'),
    ('American Express','Amex Blue Cash Preferred','amex-blue-cash-preferred','amex','cashback',NULL,9500,1.000,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/'),
    ('American Express','Amex Blue Cash Everyday','amex-blue-cash-everyday','amex','cashback',NULL,0,1.000,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/'),
    ('Chase','Chase Sapphire Preferred','chase-sapphire-preferred','visa','points','Ultimate Rewards',9500,1.000,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred'),
    ('Chase','Chase Sapphire Reserve','chase-sapphire-reserve','visa','points','Ultimate Rewards',55000,1.000,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve'),
    ('Chase','Chase Freedom Flex','chase-freedom-flex','mastercard','cashback',NULL,0,1.000,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/flex'),
    ('Chase','Chase Freedom Unlimited','chase-freedom-unlimited','visa','cashback',NULL,0,1.500,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited'),
    ('Capital One','Capital One Savor','capital-one-savor','mastercard','cashback',NULL,0,1.000,'percent','https://www.capitalone.com/credit-cards/savor/'),
    ('Capital One','Capital One Venture X','capital-one-venture-x','visa','miles','Capital One Miles',39500,2.000,'miles_per_dollar','https://www.capitalone.com/credit-cards/venture-x/'),
    ('Capital One','Capital One Venture','capital-one-venture','visa','miles','Capital One Miles',9500,2.000,'miles_per_dollar','https://www.capitalone.com/credit-cards/venture/'),
    ('Citi','Citi Double Cash','citi-double-cash','mastercard','cashback',NULL,0,2.000,'percent','https://www.citi.com/credit-cards/citi-double-cash-credit-card'),
    ('Citi','Citi Custom Cash','citi-custom-cash','mastercard','cashback',NULL,0,1.000,'percent','https://www.citi.com/credit-cards/citi-custom-cash-credit-card'),
    ('Citi','Citi Strata Premier','citi-strata-premier','mastercard','points','ThankYou Points',9500,1.000,'points_per_dollar','https://www.citi.com/credit-cards/citi-strata-premier-credit-card'),
    ('Discover','Discover it Cash Back','discover-it-cash-back','discover','cashback',NULL,0,1.000,'percent','https://www.discover.com/credit-cards/cash-back/it-card.html'),
    ('Wells Fargo','Wells Fargo Active Cash','wells-fargo-active-cash','visa','cashback',NULL,0,2.000,'percent','https://creditcards.wellsfargo.com/active-cash-credit-card/'),
    ('Wells Fargo','Wells Fargo Autograph','wells-fargo-autograph','visa','points','Wells Fargo Rewards',0,1.000,'points_per_dollar','https://creditcards.wellsfargo.com/autograph-visa-credit-card/'),
    ('Bank of America','Bank of America Customized Cash','bank-of-america-customized-cash','visa','cashback',NULL,0,1.000,'percent','https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/'),
    ('U.S. Bank','U.S. Bank Altitude Go','us-bank-altitude-go','visa','points','Altitude Rewards',0,1.000,'points_per_dollar','https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html'),
    ('Wells Fargo','Bilt Mastercard','bilt-mastercard','mastercard','points','Bilt Rewards',0,1.000,'points_per_dollar','https://www.biltrewards.com/card'),
    ('Goldman Sachs','Apple Card','apple-card','mastercard','cashback',NULL,0,1.000,'percent','https://www.apple.com/apple-card/'),
    ('Chase','Amazon Prime Visa','amazon-prime-visa','visa','cashback',NULL,0,1.000,'percent','https://www.amazon.com/Prime-Visa/b?node=16070413011'),
    ('Citi','Costco Anywhere Visa','costco-anywhere-visa','visa','cashback',NULL,0,1.000,'percent','https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card'),
    ('TD Bank','Target Circle Card','target-circle-card','mastercard','cashback',NULL,0,1.000,'percent','https://www.target.com/circlecard'),
    ('Synchrony','PayPal Cashback Mastercard','paypal-cashback-mastercard','mastercard','cashback',NULL,0,2.000,'percent','https://www.paypal.com/us/digital-wallet/manage-money/paypal-cashback-mastercard'),
    ('Capital One','Capital One Quicksilver','capital-one-quicksilver','mastercard','cashback',NULL,0,1.500,'percent','https://www.capitalone.com/credit-cards/quicksilver/')
)
INSERT INTO public.card_catalog (
  issuer, card_name, card_slug, network, rewards_currency, rewards_program,
  annual_fee_cents, base_reward_rate, base_reward_unit, official_product_url,
  verification_status, is_active
)
SELECT issuer, card_name, card_slug, network, rewards_currency, rewards_program,
       annual_fee_cents, base_reward_rate, base_reward_unit, official_product_url,
       'needs_review', true
FROM cards
ON CONFLICT (card_slug) DO UPDATE SET
  issuer = EXCLUDED.issuer,
  card_name = EXCLUDED.card_name,
  network = EXCLUDED.network,
  rewards_currency = EXCLUDED.rewards_currency,
  rewards_program = EXCLUDED.rewards_program,
  annual_fee_cents = EXCLUDED.annual_fee_cents,
  base_reward_rate = EXCLUDED.base_reward_rate,
  base_reward_unit = EXCLUDED.base_reward_unit,
  official_product_url = EXCLUDED.official_product_url,
  verification_status = CASE
    WHEN public.card_catalog.verification_status = 'verified' THEN 'verified'
    ELSE EXCLUDED.verification_status
  END,
  updated_at = now();

WITH rules(card_slug, category, reward_rate, reward_unit, source_url) AS (
  VALUES
    ('amex-gold','dining',4,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/gold-card/'),
    ('amex-gold','groceries',4,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/gold-card/'),
    ('amex-gold','travel',3,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/gold-card/'),
    ('amex-platinum','travel',5,'points_per_dollar','https://www.americanexpress.com/us/credit-cards/card/platinum/'),
    ('amex-blue-cash-preferred','groceries',6,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/'),
    ('amex-blue-cash-preferred','streaming',6,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/'),
    ('amex-blue-cash-preferred','gas',3,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/'),
    ('amex-blue-cash-everyday','groceries',3,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/'),
    ('amex-blue-cash-everyday','shopping',3,'percent','https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/'),
    ('chase-sapphire-preferred','dining',3,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred'),
    ('chase-sapphire-preferred','travel',3,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred'),
    ('chase-sapphire-reserve','travel',3,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve'),
    ('chase-sapphire-reserve','dining',3,'points_per_dollar','https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve'),
    ('chase-freedom-flex','dining',3,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/flex'),
    ('chase-freedom-flex','drugstore',3,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/flex'),
    ('chase-freedom-unlimited','dining',3,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited'),
    ('chase-freedom-unlimited','drugstore',3,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited'),
    ('chase-freedom-unlimited','other',1.5,'percent','https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited'),
    ('capital-one-savor','dining',3,'percent','https://www.capitalone.com/credit-cards/savor/'),
    ('capital-one-savor','groceries',3,'percent','https://www.capitalone.com/credit-cards/savor/'),
    ('capital-one-savor','entertainment',3,'percent','https://www.capitalone.com/credit-cards/savor/'),
    ('capital-one-venture-x','travel',5,'miles_per_dollar','https://www.capitalone.com/credit-cards/venture-x/'),
    ('capital-one-venture','travel',5,'miles_per_dollar','https://www.capitalone.com/credit-cards/venture/'),
    ('citi-double-cash','other',2,'percent','https://www.citi.com/credit-cards/citi-double-cash-credit-card'),
    ('citi-custom-cash','dining',5,'percent','https://www.citi.com/credit-cards/citi-custom-cash-credit-card'),
    ('citi-custom-cash','groceries',5,'percent','https://www.citi.com/credit-cards/citi-custom-cash-credit-card'),
    ('citi-strata-premier','dining',3,'points_per_dollar','https://www.citi.com/credit-cards/citi-strata-premier-credit-card'),
    ('citi-strata-premier','groceries',3,'points_per_dollar','https://www.citi.com/credit-cards/citi-strata-premier-credit-card'),
    ('citi-strata-premier','gas',3,'points_per_dollar','https://www.citi.com/credit-cards/citi-strata-premier-credit-card'),
    ('discover-it-cash-back','shopping',5,'percent','https://www.discover.com/credit-cards/cash-back/it-card.html'),
    ('wells-fargo-active-cash','other',2,'percent','https://creditcards.wellsfargo.com/active-cash-credit-card/'),
    ('wells-fargo-autograph','dining',3,'points_per_dollar','https://creditcards.wellsfargo.com/autograph-visa-credit-card/'),
    ('wells-fargo-autograph','travel',3,'points_per_dollar','https://creditcards.wellsfargo.com/autograph-visa-credit-card/'),
    ('wells-fargo-autograph','gas',3,'points_per_dollar','https://creditcards.wellsfargo.com/autograph-visa-credit-card/'),
    ('bank-of-america-customized-cash','shopping',3,'percent','https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/'),
    ('us-bank-altitude-go','dining',4,'points_per_dollar','https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html'),
    ('bilt-mastercard','dining',3,'points_per_dollar','https://www.biltrewards.com/card'),
    ('bilt-mastercard','travel',2,'points_per_dollar','https://www.biltrewards.com/card'),
    ('apple-card','shopping',2,'percent','https://www.apple.com/apple-card/'),
    ('amazon-prime-visa','shopping',5,'percent','https://www.amazon.com/Prime-Visa/b?node=16070413011'),
    ('amazon-prime-visa','dining',2,'percent','https://www.amazon.com/Prime-Visa/b?node=16070413011'),
    ('amazon-prime-visa','gas',2,'percent','https://www.amazon.com/Prime-Visa/b?node=16070413011'),
    ('costco-anywhere-visa','gas',4,'percent','https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card'),
    ('costco-anywhere-visa','dining',3,'percent','https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card'),
    ('costco-anywhere-visa','travel',3,'percent','https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card'),
    ('target-circle-card','shopping',5,'percent','https://www.target.com/circlecard'),
    ('paypal-cashback-mastercard','other',2,'percent','https://www.paypal.com/us/digital-wallet/manage-money/paypal-cashback-mastercard'),
    ('capital-one-quicksilver','other',1.5,'percent','https://www.capitalone.com/credit-cards/quicksilver/')
)
INSERT INTO public.card_reward_rules (
  card_catalog_id, category, reward_rate, reward_unit, merchant_scope,
  source_url, confidence_score, status
)
SELECT c.id, r.category, r.reward_rate, r.reward_unit, 'all', r.source_url, 0.80, 'needs_review'
FROM rules r
JOIN public.card_catalog c ON c.card_slug = r.card_slug
ON CONFLICT (card_catalog_id, category, merchant_scope, valid_from) DO UPDATE SET
  reward_rate = EXCLUDED.reward_rate,
  reward_unit = EXCLUDED.reward_unit,
  source_url = EXCLUDED.source_url,
  status = CASE
    WHEN public.card_reward_rules.status = 'verified' THEN 'verified'
    ELSE EXCLUDED.status
  END,
  updated_at = now();
