insert into lookup.currencies (code, display_name, symbol)
values ('USD', 'US Dollar', '$')
on conflict (code) do update set
  display_name = excluded.display_name,
  symbol = excluded.symbol;
