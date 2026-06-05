insert into lookup.plaid_item_statuses (code, display_name)
values
  ('active', 'Active'),
  ('login_required', 'Login required'),
  ('error', 'Error'),
  ('disconnected', 'Disconnected')
on conflict (code) do update set display_name = excluded.display_name;
