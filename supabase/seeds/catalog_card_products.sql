insert into catalog.card_products (issuer_id, network_id, reward_currency_id, code, display_name, annual_fee, reward_currency_name, base_reward_rate, is_active)
select i.id, n.id, r.id, 'chase_sapphire_preferred', 'Chase Sapphire Preferred', 95.00, 'Ultimate Rewards', 1.0000, true
from catalog.card_issuers i, lookup.card_networks n, lookup.reward_currencies r
where i.code = 'chase' and n.code = 'visa' and r.code = 'points'
on conflict (code) do update set display_name = excluded.display_name, updated_at = now();

insert into catalog.card_products (issuer_id, network_id, reward_currency_id, code, display_name, annual_fee, reward_currency_name, base_reward_rate, is_active)
select i.id, n.id, r.id, 'amex_gold', 'American Express Gold Card', 250.00, 'Membership Rewards', 1.0000, true
from catalog.card_issuers i, lookup.card_networks n, lookup.reward_currencies r
where i.code = 'amex' and n.code = 'amex' and r.code = 'points'
on conflict (code) do update set display_name = excluded.display_name, updated_at = now();

insert into catalog.card_products (issuer_id, network_id, reward_currency_id, code, display_name, annual_fee, reward_currency_name, base_reward_rate, is_active)
select i.id, n.id, r.id, 'capital_one_savor', 'Capital One Savor', 0.00, 'Cash back', 1.0000, true
from catalog.card_issuers i, lookup.card_networks n, lookup.reward_currencies r
where i.code = 'capital_one' and n.code = 'mastercard' and r.code = 'cashback'
on conflict (code) do update set display_name = excluded.display_name, updated_at = now();
