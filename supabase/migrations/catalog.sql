create table if not exists catalog.card_issuers (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  logo_url text,
  is_active boolean not null default true,
  rewardscc_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.card_products (
  id int generated always as identity primary key,
  issuer_id smallint not null references catalog.card_issuers(id),
  network_id smallint not null references lookup.card_networks(id),
  reward_currency_id smallint not null references lookup.reward_currencies(id),
  code text not null unique,
  display_name text not null,
  card_art_url text,
  annual_fee numeric(10,2),
  purchase_apr text,
  foreign_transaction_fee text,
  terms_summary text,
  reward_currency_name text,
  base_reward_rate numeric(6,4) not null default 1.0,
  rewardscc_id text unique,
  card_type text,
  card_url text,
  fx_fee numeric(5,2),
  credit_range text,
  base_reward_valuation numeric(8,4),
  has_lounge_access boolean not null default false,
  has_free_checked_bag boolean not null default false,
  has_trusted_traveler_credit boolean not null default false,
  has_free_hotel_night boolean not null default false,
  signup_bonus jsonb,
  perks jsonb,
  annual_spend_rewards jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.card_product_requests (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer_name text not null,
  card_name text not null,
  status text not null default 'pending',
  approved_issuer_id smallint references catalog.card_issuers(id),
  approved_card_product_id int references catalog.card_products(id),
  reviewed_by_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.categories (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  icon text,
  provider_category_id text,
  category_group text,
  subcategory_group text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_categories_provider_id_idx
  on catalog.categories(provider_category_id)
  where provider_category_id is not null;

create unique index if not exists catalog_categories_group_subgroup_idx
  on catalog.categories(category_group, subcategory_group)
  where category_group is not null;

create table if not exists catalog.category_aliases (
  id int generated always as identity primary key,
  category_id smallint not null references catalog.categories(id),
  alias text not null,
  source text,
  created_at timestamptz not null default now(),
  unique (category_id, alias)
);

create table if not exists catalog.reward_rules (
  id int generated always as identity primary key,
  card_product_id int not null references catalog.card_products(id),
  category_id smallint references catalog.categories(id),
  multiplier numeric(6,4) not null,
  cap_amount numeric(12,2),
  cap_period_id smallint,
  start_date date,
  end_date date,
  requires_activation boolean not null default false,
  -- Brand-locked rule: bonus applies only at a specific merchant brand (e.g. Hilton 12x),
  -- not generically across the subcategory_group. merchant_brand holds the RewardsCC leaf
  -- name to merchant-match against. Set by the catalog sync. See category-bridge.md.
  is_merchant_locked boolean not null default false,
  merchant_brand text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Self-heal: is_merchant_locked / merchant_brand were added to reward_rules after its initial
-- creation. `create table if not exists` cannot backfill columns on a pre-existing DB, so add them
-- idempotently (no-op on fresh DBs where the create above already includes them).
alter table catalog.reward_rules add column if not exists is_merchant_locked boolean not null default false;
alter table catalog.reward_rules add column if not exists merchant_brand text;

create index if not exists catalog_card_products_issuer_id_idx on catalog.card_products(issuer_id);
create index if not exists catalog_card_product_requests_user_id_idx on catalog.card_product_requests(user_id);
create index if not exists catalog_category_aliases_category_id_idx on catalog.category_aliases(category_id);
create index if not exists catalog_reward_rules_card_product_id_idx on catalog.reward_rules(card_product_id);

create table if not exists catalog.card_product_review_items (
  id int generated always as identity primary key,
  provider text not null,
  provider_card_id text not null,
  reason_code text not null,
  confidence numeric(4,3),
  details jsonb,
  status text not null default 'pending',
  card_product_id int references catalog.card_products(id) on delete set null,
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_card_id, reason_code)
);

create index if not exists catalog_card_product_review_items_status_idx
  on catalog.card_product_review_items(status, created_at)
  where status = 'pending';
