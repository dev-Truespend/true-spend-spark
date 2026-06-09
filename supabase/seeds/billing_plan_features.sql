insert into billing.plan_features (plan_id, feature_id, value)
select p.id, f.id, values_by_plan.value
from (values
  ('free', 'manual_card_limit', '1'),
  ('free', 'plaid_card_limit', '0'),
  ('free', 'geo_recommendations_per_day', '1'),
  ('free', 'ai_insights_enabled', 'false'),
  ('free', 'unlimited_cards', 'false'),
  ('free', 'plaid_linking_enabled', 'false'),
  ('free', 'plaid_transactions_view_enabled', 'false'),
  ('free', 'geofencing_enabled', 'true'),
  ('basic', 'manual_card_limit', '3'),
  ('basic', 'plaid_card_limit', '3'),
  ('basic', 'geo_recommendations_per_day', '3'),
  ('basic', 'ai_insights_enabled', 'false'),
  ('basic', 'unlimited_cards', 'false'),
  ('basic', 'plaid_linking_enabled', 'true'),
  ('basic', 'plaid_transactions_view_enabled', 'true'),
  ('basic', 'geofencing_enabled', 'true'),
  ('pro', 'manual_card_limit', 'unlimited'),
  ('pro', 'plaid_card_limit', 'unlimited'),
  ('pro', 'geo_recommendations_per_day', 'unlimited'),
  ('pro', 'ai_insights_enabled', 'true'),
  ('pro', 'unlimited_cards', 'true'),
  ('pro', 'plaid_linking_enabled', 'true'),
  ('pro', 'plaid_transactions_view_enabled', 'true'),
  ('pro', 'geofencing_enabled', 'true')
) as values_by_plan(plan_code, feature_code, value)
join billing.plans p on p.code = values_by_plan.plan_code
join billing.features f on f.code = values_by_plan.feature_code
on conflict (plan_id, feature_id) do update set
  value = excluded.value,
  updated_at = now();
