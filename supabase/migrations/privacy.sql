create table if not exists privacy.settings (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  anonymous_analytics_enabled boolean not null default true,
  personalized_ai_insights_enabled boolean not null default true,
  location_history_enabled boolean not null default true,
  data_sharing_for_improvement_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_settings_user_id_idx on privacy.settings(user_id);

create table if not exists privacy.account_deletion_requests (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_account_deletion_requests_user_id_idx on privacy.account_deletion_requests(user_id);
create index if not exists privacy_account_deletion_requests_due_idx
  on privacy.account_deletion_requests(purge_after)
  where status = 'pending';

create table if not exists privacy.data_export_requests (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  format text not null default 'json',
  export_url text,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_data_export_requests_user_id_idx on privacy.data_export_requests(user_id);

create table if not exists privacy.location_deletion_requests (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  delete_before timestamptz,
  deleted_event_count int,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_location_deletion_requests_user_id_idx on privacy.location_deletion_requests(user_id);

create table if not exists privacy.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists privacy_audit_events_user_id_idx on privacy.audit_events(user_id, occurred_at desc);
create index if not exists privacy_audit_events_event_type_idx on privacy.audit_events(event_type);
