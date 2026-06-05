insert into lookup.ai_insight_types (code, display_name) values
  ('reward_optimization',   'Reward Optimization'),
  ('missed_reward_pattern', 'Missed Reward Pattern'),
  ('card_recommendation',   'Card Recommendation'),
  ('spending_trend',        'Spending Trend')
on conflict (code) do update
  set display_name = excluded.display_name;
