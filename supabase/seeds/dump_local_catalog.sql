-- Dump local catalog.* (filled by a one-off local RewardsCcCatalogSync run) to the CSVs that
-- catalog_snapshot.sql replays via run-all.sql / supabase-migrate. Run AFTER RewardsCC has
-- populated local catalog.*.
--
-- Writes 5 CSVs into the CURRENT directory — run it from supabase/seeds/data/ so they land where
-- catalog_snapshot.sql expects them:
--   cd supabase/seeds/data && psql "postgresql://postgres:postgres@localhost:54322/postgres" \
--        -v ON_ERROR_STOP=1 -f ../dump_local_catalog.sql
--
-- Every cross-table reference is dumped as a BUSINESS CODE (issuer/network/currency/category/
-- cap-period code), never a raw identity id. catalog.* and the lookup tables use
-- `generated always as identity` PKs whose values differ between local and prod, so the prod
-- seed re-resolves each FK by code. The codes themselves are derived from upstream RewardsCC
-- data (issuer code = normalized name, category code = rcc_<providerId>), so they are stable
-- across environments.

\set ON_ERROR_STOP on

\copy (select code, display_name, logo_url, is_active, rewardscc_id from catalog.card_issuers order by id) to 'catalog_card_issuers.csv' with (format csv, header true)

\copy (select code, display_name, icon, provider_category_id, category_group, subcategory_group, is_active from catalog.categories order by id) to 'catalog_categories.csv' with (format csv, header true)

\copy (select p.code, i.code as issuer_code, n.code as network_code, rc.code as reward_currency_code, p.display_name, p.card_art_url, p.annual_fee, p.purchase_apr, p.foreign_transaction_fee, p.terms_summary, p.reward_currency_name, p.base_reward_rate, p.rewardscc_id, p.card_type, p.card_url, p.fx_fee, p.credit_range, p.base_reward_valuation, p.has_lounge_access, p.has_free_checked_bag, p.has_trusted_traveler_credit, p.has_free_hotel_night, p.signup_bonus, p.perks, p.annual_spend_rewards, p.is_active from catalog.card_products p join catalog.card_issuers i on i.id = p.issuer_id join lookup.card_networks n on n.id = p.network_id join lookup.reward_currencies rc on rc.id = p.reward_currency_id order by p.id) to 'catalog_card_products.csv' with (format csv, header true)

\copy (select c.code as category_code, a.alias, a.source from catalog.category_aliases a join catalog.categories c on c.id = a.category_id order by a.id) to 'catalog_category_aliases.csv' with (format csv, header true)

\copy (select p.code as card_product_code, c.code as category_code, r.multiplier, r.cap_amount, cp.code as cap_period_code, r.start_date, r.end_date, r.requires_activation, r.is_merchant_locked, r.merchant_brand, r.notes from catalog.reward_rules r join catalog.card_products p on p.id = r.card_product_id left join catalog.categories c on c.id = r.category_id left join lookup.cap_periods cp on cp.id = r.cap_period_id order by r.id) to 'catalog_reward_rules.csv' with (format csv, header true)

\echo 'Dumped: catalog_card_issuers.csv, catalog_categories.csv, catalog_card_products.csv, catalog_category_aliases.csv, catalog_reward_rules.csv'
