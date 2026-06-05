insert into billing.plans (code, display_name, description, trial_days, is_active)
values
  ('basic', 'Basic', 'Core card recommendations and rewards tracking', 0, true),
  ('pro', 'Pro', 'Unlimited links and advanced insights', 7, true)
on conflict (code) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active,
  updated_at = now();
