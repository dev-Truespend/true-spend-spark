insert into lookup.notification_channels (code, display_name) values
  ('push',  'Push'),
  ('email', 'Email'),
  ('inbox', 'In-App Inbox')
on conflict (code) do update
  set display_name = excluded.display_name;
