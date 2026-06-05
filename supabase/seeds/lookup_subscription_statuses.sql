insert into lookup.subscription_statuses (code, display_name)
values
  ('trialing', 'Trialing'),
  ('active', 'Active'),
  ('past_due', 'Past due'),
  ('canceled', 'Canceled'),
  ('incomplete', 'Incomplete'),
  ('paused', 'Paused')
on conflict (code) do update set display_name = excluded.display_name;
