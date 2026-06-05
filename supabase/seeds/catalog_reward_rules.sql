insert into catalog.reward_rules (card_product_id, category_id, multiplier, notes)
select p.id, c.id, rules.multiplier, rules.notes
from (values
  ('chase_sapphire_preferred', 'dining', 3.0, 'Strong dining reward rate'),
  ('chase_sapphire_preferred', 'travel', 2.0, 'Travel rewards'),
  ('amex_gold', 'groceries', 4.0, 'Grocery rewards'),
  ('amex_gold', 'dining', 4.0, 'Dining rewards'),
  ('capital_one_savor', 'dining', 3.0, 'Cash back dining'),
  ('capital_one_savor', 'groceries', 3.0, 'Cash back groceries')
) as rules(product_code, category_code, multiplier, notes)
join catalog.card_products p on p.code = rules.product_code
join catalog.categories c on c.code = rules.category_code
where not exists (
  select 1 from catalog.reward_rules existing
  where existing.card_product_id = p.id and existing.category_id = c.id
);
