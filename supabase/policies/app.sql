alter table app.profiles enable row level security;
alter table app.onboarding_states enable row level security;
alter table app.user_preferences enable row level security;
alter table app.user_permissions enable row level security;
alter table app.user_device_permissions enable row level security;

create policy app_profiles_owner_select on app.profiles
  for select using (auth.uid() = user_id);
create policy app_profiles_owner_insert on app.profiles
  for insert with check (auth.uid() = user_id);
create policy app_profiles_owner_update on app.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy app_onboarding_states_owner_select on app.onboarding_states
  for select using (auth.uid() = user_id);
create policy app_onboarding_states_owner_insert on app.onboarding_states
  for insert with check (auth.uid() = user_id);
create policy app_onboarding_states_owner_update on app.onboarding_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy app_user_preferences_owner_select on app.user_preferences
  for select using (auth.uid() = user_id);
create policy app_user_preferences_owner_insert on app.user_preferences
  for insert with check (auth.uid() = user_id);
create policy app_user_preferences_owner_update on app.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy app_user_permissions_owner_select on app.user_permissions
  for select using (auth.uid() = user_id);
create policy app_user_permissions_owner_insert on app.user_permissions
  for insert with check (auth.uid() = user_id);
create policy app_user_permissions_owner_update on app.user_permissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy app_user_device_permissions_owner_select on app.user_device_permissions
  for select using (auth.uid() = user_id);
create policy app_user_device_permissions_owner_insert on app.user_device_permissions
  for insert with check (auth.uid() = user_id);
create policy app_user_device_permissions_owner_update on app.user_device_permissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
