insert into lookup.card_sources (code, display_name)
values
  ('manual', 'Manual'),
  ('plaid', 'Plaid')
on conflict (code) do update set display_name = excluded.display_name;
