create table if not exists app.profiles (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  country_id smallint references billing.countries(id),
  currency_id smallint references lookup.currencies(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.onboarding_states (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_step_id smallint not null references lookup.onboarding_steps(id),
  card_connection_plaid boolean not null default false,
  card_connection_manual boolean not null default false,
  card_connection_skipped boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.user_preferences (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'system',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  hide_amounts boolean not null default false,
  biometric_unlock_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.user_permissions (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  location_permission_id smallint not null references lookup.permission_states(id),
  camera_permission_id smallint not null references lookup.permission_states(id),
  notification_permission_id smallint not null references lookup.permission_states(id),
  last_reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.user_device_permissions (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id int not null references messaging.devices(id) on delete cascade,
  location_permission_id smallint not null references lookup.permission_states(id),
  camera_permission_id smallint not null references lookup.permission_states(id),
  notification_permission_id smallint not null references lookup.permission_states(id),
  location_accuracy text,
  raw_platform_payload jsonb,
  last_reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- Per-user, per-day usage counters. One row per user per UTC day; extensible with more counter
-- columns as new daily-limited features are added. Currently tracks user-initiated Plaid re-syncs.
create table if not exists app.user_daily_usage (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  plaid_resync_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists app_profiles_user_id_idx on app.profiles(user_id);
create index if not exists app_onboarding_states_user_id_idx on app.onboarding_states(user_id);
create index if not exists app_user_preferences_user_id_idx on app.user_preferences(user_id);
create index if not exists app_user_permissions_user_id_idx on app.user_permissions(user_id);
create index if not exists app_user_device_permissions_user_id_idx on app.user_device_permissions(user_id);
create index if not exists app_user_daily_usage_user_id_idx on app.user_daily_usage(user_id);
