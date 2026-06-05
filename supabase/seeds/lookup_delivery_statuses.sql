insert into lookup.delivery_statuses (code, display_name, is_terminal) values
  ('pending',   'Pending',   false),
  ('sent',      'Sent',      false),
  ('delivered', 'Delivered', true),
  ('failed',    'Failed',    false),
  ('skipped',   'Skipped',   true),
  ('dead_lettered', 'Dead Lettered', true)
on conflict (code) do update
  set display_name = excluded.display_name,
      is_terminal  = excluded.is_terminal;
