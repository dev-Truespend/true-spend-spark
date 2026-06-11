-- supabase/run-all.sql
--
-- One-shot bootstrap for a local Supabase Postgres: applies every migration,
-- every RLS policy, and every seed file in dependency order.
--
-- Idempotency: depends on each underlying file using `CREATE ... IF NOT EXISTS`
-- and `INSERT ... ON CONFLICT DO NOTHING`. Re-running on an existing database
-- should be a no-op for anything already present.
--
-- Usage (from repo root, against the Supabase CLI Postgres on port 54322):
--   psql "postgresql://postgres:postgres@localhost:54322/postgres" \
--        -v ON_ERROR_STOP=1 -f supabase/run-all.sql
--
-- Order (topologically sorted from cross-schema FK references):
--   1. Migrations: _init -> lookup -> privacy -> security -> billing
--                  -> catalog -> insights -> finance -> messaging -> app
--      Dependencies:
--        security -> lookup
--        billing  -> lookup
--        catalog  -> lookup
--        insights -> lookup
--        finance  -> lookup, catalog
--        messaging-> lookup, finance
--        app      -> lookup, billing, messaging
--   2. Policies: alphabetical (only need tables to exist)
--   3. Seeds: lookup_* -> catalog_* -> billing_* -> messaging_*
--      (billing seeds use a custom order: parents before junction tables)

\set ON_ERROR_STOP on
\timing on

\echo ''
\echo '================================================================'
\echo '  1/3  Migrations'
\echo '================================================================'

\ir migrations/_init.sql
\ir migrations/lookup.sql
\ir migrations/privacy.sql
\ir migrations/security.sql
\ir migrations/billing.sql
\ir migrations/catalog.sql
\ir migrations/insights.sql
\ir migrations/finance.sql
\ir migrations/foursquare.sql
\ir migrations/messaging.sql
\ir migrations/app.sql

\echo ''
\echo '================================================================'
\echo '  2/3  RLS Policies'
\echo '================================================================'

-- CREATE POLICY has no IF NOT EXISTS form, so drop every existing policy in
-- the domain schemas first to make the policy files re-runnable.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname in ('app','billing','catalog','finance','insights','messaging','privacy','security')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end$$;

\ir policies/app.sql
\ir policies/billing.sql
\ir policies/catalog.sql
\ir policies/finance.sql
\ir policies/insights.sql
\ir policies/messaging.sql
\ir policies/privacy.sql
\ir policies/security.sql

\echo ''
\echo '================================================================'
\echo '  3/3  Seeds'
\echo '================================================================'

\echo '-- lookup --'
\ir seeds/lookup_ai_insight_types.sql
\ir seeds/lookup_analytics_periods.sql
\ir seeds/lookup_cap_periods.sql
\ir seeds/lookup_card_networks.sql
\ir seeds/lookup_card_sources.sql
\ir seeds/lookup_conflict_resolutions.sql
\ir seeds/lookup_currencies.sql
\ir seeds/lookup_delivery_statuses.sql
\ir seeds/lookup_device_platforms.sql
\ir seeds/lookup_entity_types.sql
\ir seeds/lookup_event_delivery_statuses.sql
\ir seeds/lookup_event_outbox_statuses.sql
\ir seeds/lookup_event_types.sql
\ir seeds/lookup_generation_statuses.sql
\ir seeds/lookup_location_event_types.sql
\ir seeds/lookup_notification_channels.sql
\ir seeds/lookup_onboarding_steps.sql
\ir seeds/lookup_periods.sql
\ir seeds/lookup_permission_states.sql
\ir seeds/lookup_plaid_item_statuses.sql
\ir seeds/lookup_priority_levels.sql
\ir seeds/lookup_recommendation_contexts.sql
\ir seeds/lookup_reward_currencies.sql
\ir seeds/lookup_roles.sql
\ir seeds/lookup_subscription_statuses.sql

\echo '-- catalog -- (no static seeds: catalog.card_issuers/card_products/categories/category_aliases/reward_rules'
\echo '--             are loaded at runtime by the RewardsCcCatalogSync worker job from the paid RewardsCC API,'
\echo '--             upserted via CatalogSyncService — never seeded here, so re-runs never touch that data.)'

\echo '-- billing --'
\ir seeds/billing_countries.sql
\ir seeds/billing_features.sql
\ir seeds/billing_plans.sql
\ir seeds/billing_plan_features.sql
\ir seeds/billing_plan_prices.sql

\echo '-- finance --'
\ir seeds/finance_transaction_categories.sql
\ir seeds/finance_transaction_category_bridge.sql

\echo '-- foursquare --'
\ir seeds/foursquare_category_bridge.sql

\echo '-- messaging --'
\ir seeds/messaging_event_subscriptions.sql
\ir seeds/messaging_notification_types.sql

\echo ''
\echo '================================================================'
\echo '  Done.'
\echo '================================================================'
