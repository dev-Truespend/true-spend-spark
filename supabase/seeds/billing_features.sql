insert into billing.features (code, display_name, description, value_type)
values
  ('card_link_limit', 'Card link limit', 'Maximum linked cards included in the plan', 'integer'),
  ('ai_insights_enabled', 'AI insights', 'Personalized AI reward insights', 'boolean'),
  ('unlimited_cards', 'Unlimited cards', 'Unlimited card linking', 'boolean'),
  ('plaid_linking_enabled', 'Plaid linking', 'Link bank cards via Plaid', 'boolean'),
  ('plaid_transactions_view_enabled', 'Plaid transactions', 'View transactions imported from linked Plaid cards', 'boolean'),
  ('geofencing_enabled', 'Geo-arrival alerts', 'Best-card push notifications when arriving at a known merchant', 'boolean')
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  value_type = excluded.value_type,
  updated_at = now();
