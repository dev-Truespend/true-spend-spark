create table if not exists insights.analytics_snapshots (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_id smallint not null references lookup.analytics_periods(id),
  period_start date not null,
  period_end date not null,
  earned_amount numeric(12,4) not null default 0,
  earned_currency_code text not null default 'cash_back',
  missed_amount numeric(12,4) not null default 0,
  prior_earned_amount numeric(12,4) not null default 0,
  prior_missed_amount numeric(12,4) not null default 0,
  daily_breakdown jsonb not null default '[]',
  category_breakdown jsonb not null default '[]',
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_id, period_start)
);

create table if not exists insights.insight_generation_runs (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status_id smallint not null references lookup.generation_statuses(id),
  prompt_version text not null,
  model_name text,
  input_token_count int,
  output_token_count int,
  cost_estimate numeric(10,6),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists insights.ai_insights (
  id int generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_run_id int not null references insights.insight_generation_runs(id),
  insight_type_id smallint not null references lookup.ai_insight_types(id),
  priority_id smallint not null references lookup.priority_levels(id),
  title text not null,
  body text not null,
  is_dismissed boolean not null default false,
  dismissed_at timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insights_analytics_snapshots_user_id_idx on insights.analytics_snapshots(user_id);
create index if not exists insights_analytics_snapshots_user_period_idx on insights.analytics_snapshots(user_id, period_id, period_start desc);
create index if not exists insights_insight_generation_runs_user_id_idx on insights.insight_generation_runs(user_id);
create index if not exists insights_insight_generation_runs_status_id_idx on insights.insight_generation_runs(status_id);
create index if not exists insights_ai_insights_user_id_idx on insights.ai_insights(user_id);
create index if not exists insights_ai_insights_user_id_dismissed_idx on insights.ai_insights(user_id, is_dismissed);
