insert into lookup.reward_currencies (code, display_name)
values
  ('cashback', 'Cash back'),
  ('points', 'Points'),
  ('miles', 'Miles')
on conflict (code) do update set display_name = excluded.display_name;
