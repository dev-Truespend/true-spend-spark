insert into lookup.event_outbox_statuses (code, display_name)
values
  ('queued', 'Queued'),
  ('dispatched', 'Dispatched'),
  ('succeeded', 'Succeeded'),
  ('partially_failed', 'Partially failed'),
  ('failed', 'Failed')
on conflict (code) do update set
  display_name = excluded.display_name;
