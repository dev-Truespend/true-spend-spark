insert into billing.features (code, display_name, description, value_type)
values
  ('manual_card_limit', 'Manual card limit', 'Maximum manually added cards included in the plan', 'integer'),
  ('plaid_card_limit', 'Plaid card limit', 'Maximum bank-linked (Plaid) cards included in the plan', 'integer'),
  ('geo_recommendations_per_day', 'Geo recommendations per day', 'Maximum geo-arrival card recommendations per day', 'integer'),
  ('ai_insights_enabled', 'AI insights', 'Personalized AI reward insights', 'boolean'),
  ('unlimited_cards', 'Unlimited cards', 'Unlimited card linking', 'boolean'),
  ('plaid_linking_enabled', 'Plaid linking', 'Link bank cards via Plaid', 'boolean'),
  ('plaid_transactions_view_enabled', 'Plaid transactions', 'View transactions imported from linked Plaid cards', 'boolean'),
  ('geofencing_enabled', 'Geo-arrival alerts', 'Best-card push notifications when arriving at a known merchant', 'boolean'),
  ('map_pins_enabled', 'Nearby map pins', 'Browse nearby rewardable merchants as pins on the home map', 'boolean'),
  ('place_search_enabled', 'Place search', 'Search for a store or gas station to get its best card', 'boolean')
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  value_type = excluded.value_type,
  updated_at = now();
