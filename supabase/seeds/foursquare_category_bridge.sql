-- Initial FSQ category fetch allowlist for FoursquarePlacesCatalogSyncJob (10a).
-- The active rows here ARE the categories the job pulls (+ their descendants, include_descendants = true).
-- category_id is pending (null) for now: the real reward categories aren't known until
-- RewardsCcCatalogSyncOrchestrationJob has run locally and
--   SELECT DISTINCT category_code FROM catalog.reward_rules WHERE multiplier > 1
-- gives the rewardable set. Fill category_id then; a re-sync backfills foursquare.places.category_id.
-- Still to add once their branch data is in hand: Grocery, Gas, Travel/Hotel, Pharmacy.
insert into foursquare.category_bridge (foursquare_category_id, foursquare_category_path, category_id, include_descendants, is_active)
values
  ('63be6904847c3692a84b9bb5', 'Dining and Drinking',                                                              null, true, true),
  ('4bf58dd8d48988d182941735', 'Arts and Entertainment > Amusement Park',                                          null, true, true),
  ('4bf58dd8d48988d193941735', 'Arts and Entertainment > Water Park',                                              null, true, true),
  ('4fceea171983d5d06c3e9823', 'Arts and Entertainment > Aquarium',                                                null, true, true),
  ('4bf58dd8d48988d17b941735', 'Arts and Entertainment > Zoo',                                                     null, true, true),
  ('4bf58dd8d48988d181941735', 'Arts and Entertainment > Museum',                                                  null, true, true),
  ('4bf58dd8d48988d17f941735', 'Arts and Entertainment > Movie Theater',                                           null, true, true),
  ('4bf58dd8d48988d1e4931735', 'Arts and Entertainment > Bowling Alley',                                           null, true, true),
  ('4bf58dd8d48988d1e1931735', 'Arts and Entertainment > Arcade',                                                  null, true, true),
  ('52e81612bcbc57f1066b79eb', 'Arts and Entertainment > Mini Golf Course',                                        null, true, true),
  ('52e81612bcbc57f1066b79ea', 'Arts and Entertainment > Go Kart Track',                                           null, true, true),
  ('52e81612bcbc57f1066b79e6', 'Arts and Entertainment > Laser Tag Center',                                        null, true, true),
  ('4bf58dd8d48988d17c941735', 'Arts and Entertainment > Casino',                                                  null, true, true),
  ('4bf58dd8d48988d11f941735', 'Arts and Entertainment > Night Club',                                              null, true, true),
  ('4bf58dd8d48988d18e941735', 'Arts and Entertainment > Comedy Club',                                             null, true, true),
  ('4bf58dd8d48988d1f2931735', 'Arts and Entertainment > Performing Arts Venue',                                   null, true, true),
  ('4bf58dd8d48988d184941735', 'Arts and Entertainment > Stadium',                                                 null, true, true),
  ('54541900498ea6ccd0202697', 'Business and Professional Services > Health and Beauty Service',                   null, true, true),
  ('4f04ae1f2fb6e1c99f3db0ba', 'Business and Professional Services > Automotive Service > Car Wash and Detail',    null, true, true),
  ('52f2ab2ebcbc57f1066b8b33', 'Business and Professional Services > Laundromat',                                  null, true, true),
  ('4bf58dd8d48988d1fc941735', 'Business and Professional Services > Laundry Service',                             null, true, true)
on conflict (foursquare_category_id) do update set
  foursquare_category_path = excluded.foursquare_category_path,
  include_descendants      = excluded.include_descendants,
  is_active                = excluded.is_active,
  updated_at               = now();
