-- Plaid PFC leaf -> RewardsCC subcategory_group bridge.
-- Left side: closed Plaid taxonomy (finance.transaction_categories, all 120 codes seeded).
-- Right side: RewardsCC subcategory_group strings (RewardsCC owns the vocabulary).
--
-- SEALED rows below use the 5 subcategory_group strings confirmed from a real RewardsCC
-- payload (All Dining, Grocery, All Gas Stations, Hotel, All Online Shopping).
--
-- The remaining rewardable Plaid leaves are STUBBED at the bottom (commented). Their exact
-- subcategory_group string is unknown until the full RewardsCC catalog is synced. After that:
--   SELECT DISTINCT subcategory_group FROM catalog.categories ORDER BY 1;
-- then fill each stub and uncomment. No AI, no runtime discovery. See job-architecture.md
-- "Category Bridge Population (gap)" and _docs/Workflows/category-bridge.md.

insert into finance.transaction_category_bridge (transaction_category_id, subcategory_group, notes)
values
  ((select id from finance.transaction_categories where code = 'FOOD_AND_DRINK_RESTAURANT'),            'All Dining',          null),
  ((select id from finance.transaction_categories where code = 'FOOD_AND_DRINK_FAST_FOOD'),             'All Dining',          'umbrella: split if RewardsCC exposes a distinct Fast Food group'),
  ((select id from finance.transaction_categories where code = 'FOOD_AND_DRINK_COFFEE'),                'All Dining',          'umbrella: split if RewardsCC exposes a distinct Coffee Shops group'),
  ((select id from finance.transaction_categories where code = 'FOOD_AND_DRINK_GROCERIES'),             'Grocery',             null),
  ((select id from finance.transaction_categories where code = 'TRANSPORTATION_GAS'),                  'All Gas Stations',    null),
  ((select id from finance.transaction_categories where code = 'TRAVEL_LODGING'),                      'Hotel',               null),
  ((select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES'), 'All Online Shopping', null)
on conflict (transaction_category_id) do update set
  subcategory_group = excluded.subcategory_group,
  notes             = excluded.notes,
  updated_at        = now();

-- STUBS — uncomment and fill `subcategory_group` from the synced RewardsCC catalog:
--   ((select id from finance.transaction_categories where code = 'TRAVEL_FLIGHTS'),                       '<Airfare?>',          null),
--   ((select id from finance.transaction_categories where code = 'TRAVEL_RENTAL_CARS'),                   '<Car Rental?>',       null),
--   ((select id from finance.transaction_categories where code = 'TRANSPORTATION_PUBLIC_TRANSIT'),        '<Transit?>',          null),
--   ((select id from finance.transaction_categories where code = 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES'), '<Rideshare?>',        null),
--   ((select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE_DEPARTMENT_STORES'),'<Department Stores?>',null),
--   ((select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE_SUPERSTORES'),      '<Wholesale?>',        null),
--   ((select id from finance.transaction_categories where code = 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS'),   '<Drugstores?>',       null),
--   ((select id from finance.transaction_categories where code = 'ENTERTAINMENT_TV_AND_MOVIES'),          '<Streaming?>',        null),
--   ((select id from finance.transaction_categories where code = 'ENTERTAINMENT_MUSIC_AND_AUDIO'),        '<Streaming?>',        null),
--   ((select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES_INTERNET_AND_CABLE'),'<Internet/Cable?>',   null),
--   ((select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES_TELEPHONE'),         '<Wireless?>',         null),
--   ((select id from finance.transaction_categories where code = 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS'),'<Gym/Fitness?>',     null),
