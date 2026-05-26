INSERT INTO public.merchant_domains
(domain, merchant_name, normalized_category, subcategory, detection_source, is_verified, confidence_score)
VALUES
('amazon.com', 'Amazon', 'shopping', 'online retail', 'seed', true, 0.95),
('walmart.com', 'Walmart', 'shopping', 'superstore', 'seed', true, 0.95),
('target.com', 'Target', 'shopping', 'department store', 'seed', true, 0.95),
('bestbuy.com', 'Best Buy', 'shopping', 'electronics', 'seed', true, 0.95),
('ubereats.com', 'Uber Eats', 'dining', 'food delivery', 'seed', true, 0.95),
('doordash.com', 'DoorDash', 'dining', 'food delivery', 'seed', true, 0.95),
('instacart.com', 'Instacart', 'groceries', 'grocery delivery', 'seed', true, 0.95),
('expedia.com', 'Expedia', 'travel', 'travel portal', 'seed', true, 0.95),
('airbnb.com', 'Airbnb', 'travel', 'lodging', 'seed', true, 0.95),
('netflix.com', 'Netflix', 'streaming', 'subscription', 'seed', true, 0.95)
ON CONFLICT (domain) DO UPDATE SET
  merchant_name = EXCLUDED.merchant_name,
  normalized_category = EXCLUDED.normalized_category,
  subcategory = EXCLUDED.subcategory,
  detection_source = EXCLUDED.detection_source,
  is_verified = EXCLUDED.is_verified,
  confidence_score = EXCLUDED.confidence_score,
  updated_at = now();
