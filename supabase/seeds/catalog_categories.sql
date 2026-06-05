insert into catalog.categories (code, display_name, icon, is_active)
values
  ('electronics', 'Electronics', 'tv', true),
  ('groceries', 'Groceries', 'shopping-cart', true),
  ('clothing', 'Clothing', 'shirt', true),
  ('home_goods', 'Home goods', 'home', true),
  ('beauty', 'Beauty', 'sparkles', true),
  ('dining', 'Dining', 'utensils', true),
  ('travel', 'Travel', 'plane', true)
on conflict (code) do update set
  display_name = excluded.display_name,
  icon = excluded.icon,
  is_active = excluded.is_active,
  updated_at = now();
