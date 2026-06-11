insert into billing.plan_prices (plan_id, country_id, period_id, price, stripe_price_id, effective_from, is_active)
select p.id, c.id, pe.id, prices.price, prices.stripe_price_id, date '2026-01-01', true
from (values
  ('basic', 'monthly', 4.99, null),
  ('basic', 'annual', 49.99, null),
  ('pro', 'monthly', 9.99, 'price_1TfMKQGy03BQ50NTFCVeS1fr'),
  ('pro', 'annual', 99.99, 'price_1TfMKmGy03BQ50NTasMjolK3')
) as prices(plan_code, period_code, price, stripe_price_id)
join billing.plans p on p.code = prices.plan_code
join billing.countries c on c.code = 'US'
join lookup.periods pe on pe.code = prices.period_code
on conflict (plan_id, country_id, period_id, effective_from) do update set
  price = excluded.price,
  stripe_price_id = excluded.stripe_price_id,
  is_active = excluded.is_active,
  updated_at = now();
