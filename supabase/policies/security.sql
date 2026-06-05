alter table security.user_roles enable row level security;

create policy security_user_roles_owner_select on security.user_roles
  for select using (auth.uid() = user_id);
