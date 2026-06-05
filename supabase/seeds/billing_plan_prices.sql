insert into billing.plan_prices (plan_id, country_id, period_id, price, stripe_price_id, effective_from, is_active)
select p.id, c.id, pe.id, prices.price, prices.stripe_price_id, date '2026-01-01', true
from (values
  ('basic', 'monthly', 0.00, null),
  ('basic', 'annual', 0.00, null),
  ('pro', 'monthly', 9.99, 'price_pro_monthly_us'),
  ('pro', 'annual', 99.99, 'price_pro_annual_us')
) as prices(plan_code, period_code, price, stripe_price_id)
join billing.plans p on p.code = prices.plan_code
join billing.countries c on c.code = 'US'
join lookup.periods pe on pe.code = prices.period_code
on conflict (plan_id, country_id, period_id, effective_from) do update set
  price = excluded.price,
  stripe_price_id = excluded.stripe_price_id,
  is_active = excluded.is_active,
  updated_at = now();
