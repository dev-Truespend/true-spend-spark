insert into billing.countries (code, display_name, currency_id, is_supported)
select 'US', 'United States', c.id, true
from lookup.currencies c
where c.code = 'USD'
on conflict (code) do update set
  display_name = excluded.display_name,
  currency_id = excluded.currency_id,
  is_supported = excluded.is_supported,
  updated_at = now();
