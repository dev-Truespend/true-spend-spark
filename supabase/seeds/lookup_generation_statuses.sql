insert into lookup.generation_statuses (code, display_name) values
  ('pending',   'Pending'),
  ('running',   'Running'),
  ('succeeded', 'Succeeded'),
  ('failed',    'Failed'),
  ('skipped',   'Skipped')
on conflict (code) do update
  set display_name = excluded.display_name;
