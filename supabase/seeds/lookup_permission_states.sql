insert into lookup.permission_states (code, display_name)
values
  ('unknown', 'Unknown'),
  ('not_determined', 'Not determined'),
  ('denied', 'Denied'),
  ('restricted', 'Restricted'),
  ('limited', 'Limited'),
  ('provisional', 'Provisional'),
  ('granted', 'Granted'),
  ('authorized', 'Authorized'),
  ('authorized_when_in_use', 'Authorized when in use'),
  ('authorized_always', 'Authorized always'),
  ('authorized_once', 'Authorized once')
on conflict (code) do update set
  display_name = excluded.display_name;
