insert into messaging.notification_types (code, display_name, description, default_enabled, honors_quiet_hours, is_active)
values
  ('best_card_alert', 'Best card alerts', 'Recommended card nudges', true, true, true),
  ('missed_rewards', 'Missed rewards', 'Alerts when a better card could have earned more', true, true, true),
  ('weekly_summary', 'Weekly summary', 'Weekly rewards summary', true, true, true),
  ('unusual_transaction', 'Unusual transaction', 'Unusual card activity alerts', true, true, true),
  ('subscription_expiry', 'Trial & plan expiry', 'Reminders before a free trial or plan ends', true, false, true),
  ('system', 'System', 'Account and security notices', true, false, true)
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  default_enabled = excluded.default_enabled,
  honors_quiet_hours = excluded.honors_quiet_hours,
  is_active = excluded.is_active,
  updated_at = now();
