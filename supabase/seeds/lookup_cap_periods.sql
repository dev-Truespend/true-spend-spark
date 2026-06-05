insert into lookup.cap_periods (code, display_name) values
  ('per_transaction', 'Per Transaction'),
  ('monthly',         'Monthly'),
  ('quarterly',       'Quarterly'),
  ('annual',          'Annual'),
  ('lifetime',        'Lifetime')
on conflict (code) do update
  set display_name = excluded.display_name;
