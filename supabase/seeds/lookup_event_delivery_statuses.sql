insert into lookup.event_delivery_statuses (code, display_name)
values
  ('pending', 'Pending'),
  ('processing', 'Processing'),
  ('succeeded', 'Succeeded'),
  ('retrying', 'Retrying'),
  ('dead_lettered', 'Dead lettered')
on conflict (code) do update set
  display_name = excluded.display_name;
