insert into lookup.entity_types (code, display_name) values
  ('transactions',            'Transactions'),
  ('cards',                   'Cards'),
  ('notifications',           'Notifications'),
  ('notification_reminders',  'Notification Reminders'),
  ('card_reward_overrides',   'Card Reward Overrides')
on conflict (code) do update
  set display_name = excluded.display_name;
