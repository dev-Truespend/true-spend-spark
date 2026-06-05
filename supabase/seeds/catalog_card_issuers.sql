insert into catalog.card_issuers (code, display_name, logo_url, is_active)
values
  ('chase', 'Chase', null, true),
  ('amex', 'American Express', null, true),
  ('capital_one', 'Capital One', null, true)
on conflict (code) do update set
  display_name = excluded.display_name,
  logo_url = excluded.logo_url,
  is_active = excluded.is_active,
  updated_at = now();
