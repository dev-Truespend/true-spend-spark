create table if not exists billing.countries (
  id smallint generated always as identity primary key,
  code char(2) not null unique,
  display_name text not null,
  currency_id smallint references lookup.currencies(id),
  is_supported boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing.plans (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  description text,
  trial_days smallint not null default 0,
  stripe_product_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing.plan_prices (
  id int generated always as identity primary key,
  plan_id smallint not null references billing.plans(id),
  country_id smallint not null references billing.countries(id),
  period_id smallint not null references lookup.periods(id),
  price numeric(10,2) not null,
  stripe_price_id text unique,
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, country_id, period_id, effective_from)
);

create table if not exists billing.features (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  description text,
  value_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing.plan_features (
  id int generated always as identity primary key,
  plan_id smallint not null references billing.plans(id),
  feature_id smallint not null references billing.features(id),
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, feature_id)
);

create table if not exists billing.stripe_customers (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing.subscriptions (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id smallint not null references billing.plans(id),
  plan_price_id int not null references billing.plan_prices(id),
  stripe_subscription_id text not null unique,
  status_id smallint not null references lookup.subscription_statuses(id),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx on billing.subscriptions(user_id);

create table if not exists billing.payment_methods (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id int not null references billing.stripe_customers(id) on delete cascade,
  stripe_payment_method_id text not null unique,
  brand text,
  last_four text,
  exp_month smallint,
  exp_year smallint,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_payment_methods_user_id_idx on billing.payment_methods(user_id);

create table if not exists billing.stripe_webhook_events (
  id bigint generated always as identity primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create index if not exists billing_stripe_webhook_events_event_type_idx on billing.stripe_webhook_events(event_type);
