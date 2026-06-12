-- FSQ category fetch allowlist + FSQ->internal-category map for the geo-arrival path (10a).
-- The active rows here ARE the categories FoursquarePlacesCatalogSyncJob pulls (+ descendants when
-- include_descendants = true), and the same rows drive category_id resolution in the one-time bulk
-- load (supabase/dataload/load_foursquare_places.sql).
--
-- category_id is resolved by CATALOG CODE, never a raw id, so it stays correct across local/prod
-- (catalog.categories uses a generated identity PK; its code = rcc_<rewardsCcCategoryId> is stable).
-- The codes below are NULL until the curated FSQ->reward-category mapping is finalized: the rewardable
-- set isn't known until RewardsCcCatalogSync has run locally. After it runs,
--   SELECT id, code, display_name, category_group, subcategory_group FROM catalog.categories
-- gives the catalog codes; fill the `category_code` column here, re-apply this seed, then re-run the
-- places load to backfill foursquare.places.category_id. Rows with category_code = null fetch places
-- (allowlist) but leave those places' category_id null until mapped.
insert into foursquare.category_bridge
  (foursquare_category_id, foursquare_category_path, category_id, include_descendants, is_active)
select v.fsq_id, v.fsq_path,
       (select id from catalog.categories c where c.code = v.category_code),
       v.include_descendants, true
from (values
  -- (foursquare_category_id, foursquare_category_path, category_code, include_descendants)
  -- category_code -> catalog.categories.code (rcc_<rewardsCcCategoryId>); null = fetch-allowlist only.
  -- Dining
  ('63be6904847c3692a84b9bb5', 'Dining and Drinking',                                                           'rcc_160378660'::text, true),
  -- Arts and Entertainment: Movie Theater -> Movie Theatres, everything else -> Live Entertainment
  ('4bf58dd8d48988d182941735', 'Arts and Entertainment > Amusement Park',                                       'rcc_929639080', true),
  ('4bf58dd8d48988d193941735', 'Arts and Entertainment > Water Park',                                           'rcc_929639080', true),
  ('4fceea171983d5d06c3e9823', 'Arts and Entertainment > Aquarium',                                             'rcc_929639080', true),
  ('4bf58dd8d48988d17b941735', 'Arts and Entertainment > Zoo',                                                  'rcc_929639080', true),
  ('4bf58dd8d48988d181941735', 'Arts and Entertainment > Museum',                                               'rcc_929639080', true),
  ('4bf58dd8d48988d17f941735', 'Arts and Entertainment > Movie Theater',                                        'rcc_2054018678', true),
  ('4bf58dd8d48988d1e4931735', 'Arts and Entertainment > Bowling Alley',                                        'rcc_929639080', true),
  ('4bf58dd8d48988d1e1931735', 'Arts and Entertainment > Arcade',                                               'rcc_929639080', true),
  ('52e81612bcbc57f1066b79eb', 'Arts and Entertainment > Mini Golf Course',                                     'rcc_929639080', true),
  ('52e81612bcbc57f1066b79ea', 'Arts and Entertainment > Go Kart Track',                                        'rcc_929639080', true),
  ('52e81612bcbc57f1066b79e6', 'Arts and Entertainment > Laser Tag Center',                                     'rcc_929639080', true),
  ('4bf58dd8d48988d17c941735', 'Arts and Entertainment > Casino',                                               'rcc_929639080', true),
  ('4bf58dd8d48988d11f941735', 'Arts and Entertainment > Night Club',                                           'rcc_929639080', true),
  ('4bf58dd8d48988d18e941735', 'Arts and Entertainment > Comedy Club',                                          'rcc_929639080', true),
  ('4bf58dd8d48988d1f2931735', 'Arts and Entertainment > Performing Arts Venue',                                'rcc_929639080', true),
  ('4bf58dd8d48988d184941735', 'Arts and Entertainment > Stadium',                                              'rcc_929639080', true),
  -- Business and Professional Services: Health & Beauty -> Health & Wellness; auto/laundry unmapped
  ('54541900498ea6ccd0202697', 'Business and Professional Services > Health and Beauty Service',                'rcc_2084067958', true),
  ('4f04ae1f2fb6e1c99f3db0ba', 'Business and Professional Services > Automotive Service > Car Wash and Detail', null, true),
  ('52f2ab2ebcbc57f1066b8b33', 'Business and Professional Services > Laundromat',                               null, true),
  ('4bf58dd8d48988d1fc941735', 'Business and Professional Services > Laundry Service',                          null, true),
  -- Grocery / Supermarket -> Grocery Stores
  ('4bf58dd8d48988d118951735', 'Retail > Food and Beverage Retail > Grocery Store',                            'rcc_1132334901', true),
  ('52f2ab2ebcbc57f1066b8b46', 'Retail > Food and Beverage Retail > Supermarket',                              'rcc_1132334901', true),
  -- Convenience (unmapped) / big-box + department -> Department Stores / warehouse + wholesaler -> Wholesale Clubs
  ('4d954b0ea243a5684a65b473', 'Retail > Convenience Store',                                                   null, true),
  ('52f2ab2ebcbc57f1066b8b42', 'Retail > Big Box Store',                                                       'rcc_1881287255', true),
  ('4bf58dd8d48988d1f6941735', 'Retail > Department Store',                                                     'rcc_1881287255', true),
  ('52e81612bcbc57f1066b7a36', 'Business and Professional Services > Warehouse',                                'rcc_1386466601', true),
  ('63be6904847c3692a84b9b98', 'Business and Professional Services > Wholesaler',                               'rcc_1386466601', true),
  -- Pharmacy / drugstore -> Drugstores
  ('4bf58dd8d48988d10f951735', 'Retail > Pharmacy',                                                            'rcc_1096261883', true),
  ('5745c2e4498e11e7bccabdbd', 'Retail > Drugstore',                                                           'rcc_1096261883', true),
  -- Fuel -> Gas Stations
  ('4bf58dd8d48988d113951735', 'Travel and Transportation > Fuel Station',                                     'rcc_1455345350', true),
  -- Lodging -> Hotels (covers Hotel/Motel/Resort/Inn/... via descendants)
  ('63be6904847c3692a84b9c25', 'Travel and Transportation > Lodging',                                          'rcc_164006704', true),
  -- Transit -> Transit/Transportation (Transport Hub covers Airport/Bus/Rail/Metro via descendants)
  ('63be6904847c3692a84b9c28', 'Travel and Transportation > Transport Hub',                                    'rcc_1468589631', true),
  ('4bf58dd8d48988d12a951735', 'Travel and Transportation > Train',                                            'rcc_1468589631', true)
) as v(fsq_id, fsq_path, category_code, include_descendants)
on conflict (foursquare_category_id) do update set
  foursquare_category_path = excluded.foursquare_category_path,
  category_id              = excluded.category_id,
  include_descendants      = excluded.include_descendants,
  is_active                = excluded.is_active,
  updated_at               = now();
