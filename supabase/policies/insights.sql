alter table insights.analytics_snapshots enable row level security;
alter table insights.insight_generation_runs enable row level security;
alter table insights.ai_insights enable row level security;

create policy insights_analytics_snapshots_owner_select on insights.analytics_snapshots
  for select using (auth.uid() = user_id);

create policy insights_insight_generation_runs_owner_select on insights.insight_generation_runs
  for select using (auth.uid() = user_id);

create policy insights_ai_insights_owner_select on insights.ai_insights
  for select using (auth.uid() = user_id);
create policy insights_ai_insights_owner_update on insights.ai_insights
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
