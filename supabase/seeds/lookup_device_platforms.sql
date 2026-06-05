insert into lookup.device_platforms (code, display_name)
values
  ('ios', 'iOS'),
  ('android', 'Android')
on conflict (code) do update set
  display_name = excluded.display_name;
