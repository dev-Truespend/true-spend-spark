insert into lookup.card_networks (code, display_name)
values
  ('visa', 'Visa'),
  ('mastercard', 'Mastercard'),
  ('amex', 'American Express'),
  ('discover', 'Discover')
on conflict (code) do update set display_name = excluded.display_name;
