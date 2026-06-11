create table if not exists finance.plaid_items (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null unique,
  plaid_institution_id text not null,
  institution_name text not null,
  institution_logo_url text,
  access_token_encrypted text not null,
  status_id smallint not null references lookup.plaid_item_statuses(id),
  last_sync_at timestamptz,
  transaction_sync_cursor text,
  last_transaction_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance.plaid_accounts (
  id int generated always as identity primary key,
  plaid_item_id int not null references finance.plaid_items(id) on delete cascade,
  plaid_account_id text not null unique,
  account_name text not null,
  mask text,
  subtype text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance.user_cards (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_product_id int references catalog.card_products(id),
  catalog_request_id int references catalog.card_product_requests(id),
  plaid_account_id int references finance.plaid_accounts(id),
  source_id smallint not null references lookup.card_sources(id),
  sync_status text not null default 'active',
  custom_issuer_name text,
  custom_card_name text,
  nickname text,
  last_four text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance.card_reward_overrides (
  id int generated always as identity primary key,
  user_card_id int not null references finance.user_cards(id) on delete cascade,
  category_id smallint references catalog.categories(id),
  multiplier numeric(6,4) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance.merchants (
  id int generated always as identity primary key,
  canonical_name text not null,
  normalized_name text not null,
  category_id smallint references catalog.categories(id),
  mapkit_place_id text unique,
  google_place_id text unique,
  lat numeric,
  lng numeric,
  address text,
  is_multi_category boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance.merchant_visits (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id int not null references finance.merchants(id) on delete cascade,
  selected_category_id smallint references catalog.categories(id),
  visited_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists finance.recommendations (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id int references finance.merchants(id),
  recommended_user_card_id int not null references finance.user_cards(id),
  category_id smallint references catalog.categories(id),
  expected_reward_rate numeric(6,4),
  expected_reward_amount numeric(10,2),
  context_id smallint not null references lookup.recommendation_contexts(id),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists finance.transaction_categories (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  parent_id smallint references finance.transaction_categories(id),
  is_primary boolean not null,
  is_outflow boolean not null default true,
  icon text,
  display_order smallint,
  source text not null default 'plaid',
  source_version text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transaction_categories_parent_id_idx
  on finance.transaction_categories(parent_id);

create index if not exists finance_transaction_categories_outflow_idx
  on finance.transaction_categories(is_outflow)
  where is_outflow;

-- Plaid PFC leaf -> RewardsCC subcategory_group. One row per bridgeable Plaid leaf.
-- subcategory_group is plain text (RewardsCC owns the vocabulary; not a catalog FK).
-- Pre-built before prod; looked up (never written) during transaction sync. See _docs/Workflows/category-bridge.md.
create table if not exists finance.transaction_category_bridge (
  transaction_category_id smallint primary key references finance.transaction_categories(id),
  subcategory_group text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transaction_category_bridge_subcategory_group_idx
  on finance.transaction_category_bridge(subcategory_group);

create table if not exists finance.transactions (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'manual',
  plaid_transaction_id text unique,
  plaid_account_id int references finance.plaid_accounts(id),
  user_card_id int not null references finance.user_cards(id),
  merchant_id int references finance.merchants(id),
  category_id smallint references catalog.categories(id),
  transaction_category_id smallint references finance.transaction_categories(id),
  plaid_confidence_level text,
  amount numeric(12,2) not null,
  transaction_date date not null,
  transaction_time time,
  is_pending boolean not null default false,
  description text,
  location_label text,
  location_lat numeric,
  location_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transactions_transaction_category_id_idx
  on finance.transactions(transaction_category_id);

create table if not exists finance.transaction_reward_results (
  id int generated always as identity primary key,
  transaction_id int not null unique references finance.transactions(id) on delete cascade,
  earned_rate numeric(6,4) not null,
  earned_amount numeric(12,4) not null,
  reward_currency_id smallint references lookup.reward_currencies(id),
  rule_applied_id int references catalog.reward_rules(id),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists finance.missed_reward_events (
  id int generated always as identity primary key,
  transaction_id int not null unique references finance.transactions(id) on delete cascade,
  better_user_card_id int not null references finance.user_cards(id),
  actual_reward_amount numeric(12,4) not null,
  potential_reward_amount numeric(12,4) not null,
  missed_amount numeric(12,4) not null,
  is_dismissed boolean not null default false,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Geo-arrival ingress idempotency for BOTH providers (10a). provider distinguishes the
-- source ('foursquare' webhook vs 'custom' device JWT); event id dedup is per (provider, event id).
-- The custom path's foursquare_event_id is a stable per-stop key (custom:{user}:{bucket}:{latlng}:{place}),
-- not a fresh GUID, so background retries dedup instead of re-notifying.
create table if not exists finance.foursquare_webhook_events (
  id int generated always as identity primary key,
  provider text not null default 'foursquare',
  foursquare_event_id text not null,
  event_type text not null,
  foursquare_user_id text,
  user_id uuid references auth.users(id) on delete set null,
  merchant_id int references finance.merchants(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists finance_foursquare_webhook_events_provider_event_idx
  on finance.foursquare_webhook_events(provider, foursquare_event_id);

create table if not exists finance.plaid_webhook_events (
  id int generated always as identity primary key,
  plaid_event_id text not null unique,
  webhook_type text not null,
  webhook_code text not null,
  plaid_item_id int references finance.plaid_items(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create table if not exists finance.location_events (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  accuracy_meters numeric,
  merchant_id int references finance.merchants(id) on delete set null,
  event_type_id smallint not null references lookup.location_event_types(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists finance_plaid_items_user_id_idx on finance.plaid_items(user_id);
create index if not exists finance_user_cards_user_id_idx on finance.user_cards(user_id);
create index if not exists finance_card_reward_overrides_user_card_id_idx on finance.card_reward_overrides(user_card_id);
create index if not exists finance_merchants_normalized_name_idx on finance.merchants(normalized_name);
create index if not exists finance_merchant_visits_user_id_idx on finance.merchant_visits(user_id);
create index if not exists finance_recommendations_user_id_idx on finance.recommendations(user_id);
create index if not exists finance_transactions_user_id_idx on finance.transactions(user_id);
create index if not exists finance_transactions_user_card_id_idx on finance.transactions(user_card_id);
create index if not exists finance_transactions_transaction_date_idx on finance.transactions(transaction_date desc);
create index if not exists finance_missed_reward_events_transaction_id_idx on finance.missed_reward_events(transaction_id);
create index if not exists finance_foursquare_webhook_events_user_id_idx on finance.foursquare_webhook_events(user_id);
create index if not exists finance_foursquare_webhook_events_event_type_idx on finance.foursquare_webhook_events(event_type);
create index if not exists finance_plaid_webhook_events_plaid_item_id_idx on finance.plaid_webhook_events(plaid_item_id);
create index if not exists finance_plaid_webhook_events_user_id_idx on finance.plaid_webhook_events(user_id);
create index if not exists finance_plaid_webhook_events_webhook_code_idx on finance.plaid_webhook_events(webhook_type, webhook_code);
create index if not exists finance_location_events_user_id_idx on finance.location_events(user_id, occurred_at desc);
create index if not exists finance_location_events_event_type_id_idx on finance.location_events(event_type_id);

create table if not exists finance.plaid_institutions (
  id int generated always as identity primary key,
  plaid_institution_id text not null unique,
  name text not null,
  normalized_name text not null,
  country_code text not null,
  logo_url text,
  primary_color text,
  url text,
  oauth boolean not null default false,
  products text[] not null default '{}',
  routing_numbers text[] not null default '{}',
  is_active boolean not null default true,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_plaid_institutions_normalized_name_idx on finance.plaid_institutions(normalized_name);
create index if not exists finance_plaid_institutions_country_code_idx on finance.plaid_institutions(country_code);
create index if not exists finance_plaid_institutions_is_active_idx on finance.plaid_institutions(is_active);
