insert into lookup.periods (code, display_name)
values
  ('monthly', 'Monthly'),
  ('annual', 'Annual')
on conflict (code) do update set display_name = excluded.display_name;
