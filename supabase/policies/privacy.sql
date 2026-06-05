alter table privacy.settings enable row level security;

create policy privacy_settings_owner_select on privacy.settings
  for select using (auth.uid() = user_id);
create policy privacy_settings_owner_insert on privacy.settings
  for insert with check (auth.uid() = user_id);
create policy privacy_settings_owner_update on privacy.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
