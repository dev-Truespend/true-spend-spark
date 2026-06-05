create table if not exists messaging.devices (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id smallint not null references lookup.device_platforms(id),
  push_token text unique,
  device_name text,
  app_version text,
  os_version text,
  locale text,
  timezone text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messaging.notification_preferences (
  id int generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  master_enabled boolean not null default true,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messaging.notification_types (
  id smallint generated always as identity primary key,
  code text not null unique,
  display_name text not null,
  description text,
  default_enabled boolean not null default true,
  honors_quiet_hours boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messaging.notification_type_preferences (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type_id smallint not null references messaging.notification_types(id),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, notification_type_id)
);

create table if not exists messaging.event_outbox (
  id int generated always as identity primary key,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id int,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  status_id smallint not null references lookup.event_outbox_statuses(id),
  available_at timestamptz not null default now(),
  dispatched_at timestamptz,
  succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, idempotency_key)
);

create table if not exists messaging.event_subscriptions (
  id int generated always as identity primary key,
  event_type text not null,
  consumer_name text not null,
  is_active boolean not null default true,
  max_retries smallint not null default 5,
  retry_backoff_seconds int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, consumer_name)
);

create table if not exists messaging.event_deliveries (
  id int generated always as identity primary key,
  event_outbox_id int not null references messaging.event_outbox(id) on delete cascade,
  event_subscription_id int not null references messaging.event_subscriptions(id) on delete cascade,
  status_id smallint not null references lookup.event_delivery_statuses(id),
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  succeeded_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_outbox_id, event_subscription_id)
);

create table if not exists messaging.notifications (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type_id smallint not null references messaging.notification_types(id),
  title text not null,
  body text not null,
  related_transaction_id int references finance.transactions(id) on delete set null,
  related_missed_reward_event_id int references finance.missed_reward_events(id) on delete set null,
  payload jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messaging.notification_reminders (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_notification_id int references messaging.notifications(id) on delete set null,
  remind_at timestamptz not null,
  title text not null,
  body text not null,
  is_fired boolean not null default false,
  fired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messaging.notification_deliveries (
  id int generated always as identity primary key,
  notification_id int not null references messaging.notifications(id) on delete cascade,
  device_id int references messaging.devices(id) on delete set null,
  channel_id smallint not null references lookup.notification_channels(id),
  status_id smallint not null references lookup.delivery_statuses(id),
  external_id text,
  error_code text,
  error_message text,
  attempted_at timestamptz not null default now(),
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  attempt_count smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists messaging_devices_user_id_idx on messaging.devices(user_id);
create index if not exists messaging_notification_type_preferences_user_id_idx on messaging.notification_type_preferences(user_id);
create index if not exists messaging_event_outbox_status_id_idx on messaging.event_outbox(status_id, available_at);
create index if not exists messaging_event_deliveries_status_id_idx on messaging.event_deliveries(status_id, next_attempt_at);
create index if not exists messaging_event_subscriptions_event_type_idx on messaging.event_subscriptions(event_type) where is_active;
create index if not exists messaging_notifications_user_id_idx on messaging.notifications(user_id);
create index if not exists messaging_notifications_is_read_idx on messaging.notifications(user_id, is_read) where not is_read;
create index if not exists messaging_notification_reminders_user_id_idx on messaging.notification_reminders(user_id);
create index if not exists messaging_notification_reminders_remind_at_idx on messaging.notification_reminders(remind_at) where not is_fired;
create index if not exists messaging_notification_deliveries_notification_id_idx on messaging.notification_deliveries(notification_id);

create table if not exists messaging.admin_notification_campaigns (
  id int generated always as identity primary key,
  notification_type_id smallint not null references messaging.notification_types(id),
  title_template text not null,
  body_template text not null,
  template_data jsonb not null default '{}'::jsonb,
  audience_selector jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status text not null default 'queued',
  audience_cursor text,
  idempotency_key text unique,
  created_by_user_id uuid references auth.users(id) on delete set null,
  total_recipients int,
  notifications_created int not null default 0,
  gated_out int not null default 0,
  failed int not null default 0,
  last_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messaging_admin_notification_campaigns_status_idx
  on messaging.admin_notification_campaigns(status, scheduled_for)
  where status = 'queued';
