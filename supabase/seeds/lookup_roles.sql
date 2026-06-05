insert into lookup.roles (code, display_name, description)
values
  ('user', 'User', 'Default signed-in user'),
  ('developer', 'Developer', 'Internal development access'),
  ('admin', 'Admin', 'Administrative access')
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  updated_at = now();
