insert into lookup.onboarding_steps (code, display_name, sort_order)
values
  ('card_connection', 'Card connection', 10),
  ('location_permission', 'Location permission', 20),
  ('plan_selection', 'Plan selection', 30),
  ('notifications', 'Notifications', 40),
  ('complete', 'Complete', 50)
on conflict (code) do update set
  display_name = excluded.display_name,
  sort_order = excluded.sort_order;
