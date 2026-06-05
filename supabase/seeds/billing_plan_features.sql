insert into billing.plan_features (plan_id, feature_id, value)
select p.id, f.id, values_by_plan.value
from (values
  ('basic', 'card_link_limit', '3'),
  ('basic', 'ai_insights_enabled', 'false'),
  ('basic', 'unlimited_cards', 'false'),
  ('basic', 'plaid_linking_enabled', 'false'),
  ('basic', 'plaid_transactions_view_enabled', 'false'),
  ('basic', 'geofencing_enabled', 'true'),
  ('pro', 'card_link_limit', 'unlimited'),
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
