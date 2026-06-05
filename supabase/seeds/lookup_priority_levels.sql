insert into lookup.priority_levels (code, display_name, sort_order) values
  ('high',   'High',   1),
  ('medium', 'Medium', 2),
  ('low',    'Low',    3)
on conflict (code) do update
  set display_name = excluded.display_name,
      sort_order   = excluded.sort_order;
