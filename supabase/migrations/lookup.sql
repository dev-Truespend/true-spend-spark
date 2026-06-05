create table if not exists lookup.currencies (
  id smallint generated always as identity primary key,
  code char(3) not null unique,
  display_name text not null,
  symbol text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.onboarding_steps (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.permission_states (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.device_platforms (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.roles (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lookup.card_networks (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.reward_currencies (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.plaid_item_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.card_sources (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.periods (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.subscription_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.recommendation_contexts (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.location_event_types (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.event_outbox_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.event_delivery_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.analytics_periods (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.generation_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.ai_insight_types (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.priority_levels (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  sort_order smallint not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.entity_types (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.operations (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.conflict_resolutions (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.event_types (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);

create table if not exists lookup.notification_channels (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lookup.delivery_statuses (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists lookup.cap_periods (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);
