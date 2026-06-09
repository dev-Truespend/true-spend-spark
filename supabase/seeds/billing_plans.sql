insert into billing.plans (code, display_name, description, trial_days, is_active)
values
  ('free', 'Free', 'One card and one daily card tip to get started', 0, true),
  ('basic', 'Basic', 'Core card recommendations and rewards tracking', 7, true),
  ('pro', 'Pro', 'Unlimited links and advanced insights', 14, true)
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active,
  updated_at = now();
