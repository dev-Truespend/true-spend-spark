insert into lookup.analytics_periods (code, display_name, sort_order) values
  ('week',    'This Week',    1),
  ('month',   'This Month',   2),
  ('quarter', 'This Quarter', 3),
  ('year',    'This Year',    4)
on conflict (code) do update
  set display_name = excluded.display_name,
      sort_order   = excluded.sort_order;
