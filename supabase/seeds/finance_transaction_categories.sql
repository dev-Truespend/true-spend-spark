-- Plaid Personal Finance Categories taxonomy (16 primaries + ~104 detaileds).
-- Source: https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv
-- Two-pass insert so detailed rows can resolve parent_id via a sub-select on primary code.

-- Pass 1 — 16 primaries.
insert into finance.transaction_categories (code, display_name, parent_id, is_primary, is_outflow, icon, display_order, source, source_version)
values
  ('INCOME',                    'Income',               null, true, false, '💰', 1,  'plaid', 'pfc-v1'),
  ('TRANSFER_IN',               'Transfer In',          null, true, false, '⬇️', 2,  'plaid', 'pfc-v1'),
  ('TRANSFER_OUT',              'Transfer Out',         null, true, false, '⬆️', 3,  'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS',             'Loan Payments',        null, true, false, '🏦', 4,  'plaid', 'pfc-v1'),
  ('BANK_FEES',                 'Bank Fees',            null, true, false, '💳', 5,  'plaid', 'pfc-v1'),
  ('ENTERTAINMENT',             'Entertainment',        null, true, true,  '🎬', 6,  'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK',            'Food & Drink',         null, true, true,  '🍽️', 7,  'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE',       'General Merchandise',  null, true, true,  '🛍️', 8,  'plaid', 'pfc-v1'),
  ('HOME_IMPROVEMENT',          'Home Improvement',     null, true, true,  '🏠', 9,  'plaid', 'pfc-v1'),
  ('MEDICAL',                   'Medical',              null, true, true,  '🩺', 10, 'plaid', 'pfc-v1'),
  ('PERSONAL_CARE',             'Personal Care',        null, true, true,  '🧴', 11, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES',          'General Services',     null, true, true,  '🛠️', 12, 'plaid', 'pfc-v1'),
  ('GOVERNMENT_AND_NON_PROFIT', 'Government & Non-Profit', null, true, true, '🏛️', 13, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION',            'Transportation',       null, true, true,  '🚗', 14, 'plaid', 'pfc-v1'),
  ('TRAVEL',                    'Travel',               null, true, true,  '✈️', 15, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES',        'Rent & Utilities',     null, true, true,  '🏘️', 16, 'plaid', 'pfc-v1')
on conflict (code) do update set
  display_name   = excluded.display_name,
  is_primary     = excluded.is_primary,
  is_outflow     = excluded.is_outflow,
  icon           = excluded.icon,
  display_order  = excluded.display_order,
  source         = excluded.source,
  source_version = excluded.source_version,
  is_active      = true,
  updated_at     = now();

-- Pass 2 — detaileds.
insert into finance.transaction_categories (code, display_name, parent_id, is_primary, is_outflow, source, source_version)
values
  -- INCOME (inherits is_outflow=false)
  ('INCOME_DIVIDENDS',                          'Dividends',                       (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_INTEREST_EARNED',                    'Interest Earned',                 (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_RETIREMENT_PENSION',                 'Retirement Pension',              (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_TAX_REFUND',                         'Tax Refund',                      (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_UNEMPLOYMENT',                       'Unemployment',                    (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_WAGES',                              'Wages',                           (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),
  ('INCOME_OTHER_INCOME',                       'Other Income',                    (select id from finance.transaction_categories where code = 'INCOME'),                    false, false, 'plaid', 'pfc-v1'),

  -- TRANSFER_IN
  ('TRANSFER_IN_CASH_ADVANCES_AND_LOANS',       'Cash Advances & Loans',           (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_IN_DEPOSIT',                       'Deposit',                         (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS','Investment & Retirement Funds',  (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_IN_SAVINGS',                       'Savings',                         (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_IN_ACCOUNT_TRANSFER',              'Account Transfer In',             (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_IN_OTHER_TRANSFER_IN',             'Other Transfer In',               (select id from finance.transaction_categories where code = 'TRANSFER_IN'),               false, false, 'plaid', 'pfc-v1'),

  -- TRANSFER_OUT
  ('TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS','Investment & Retirement Funds', (select id from finance.transaction_categories where code = 'TRANSFER_OUT'),              false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_OUT_SAVINGS',                      'Savings',                         (select id from finance.transaction_categories where code = 'TRANSFER_OUT'),              false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_OUT_WITHDRAWAL',                   'Withdrawal',                      (select id from finance.transaction_categories where code = 'TRANSFER_OUT'),              false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_OUT_ACCOUNT_TRANSFER',             'Account Transfer Out',            (select id from finance.transaction_categories where code = 'TRANSFER_OUT'),              false, false, 'plaid', 'pfc-v1'),
  ('TRANSFER_OUT_OTHER_TRANSFER_OUT',           'Other Transfer Out',              (select id from finance.transaction_categories where code = 'TRANSFER_OUT'),              false, false, 'plaid', 'pfc-v1'),

  -- LOAN_PAYMENTS
  ('LOAN_PAYMENTS_CAR_PAYMENT',                 'Car Payment',                     (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',         'Credit Card Payment',             (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT',       'Personal Loan Payment',           (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS_MORTGAGE_PAYMENT',            'Mortgage Payment',                (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT',        'Student Loan Payment',            (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),
  ('LOAN_PAYMENTS_OTHER_PAYMENT',               'Other Loan Payment',              (select id from finance.transaction_categories where code = 'LOAN_PAYMENTS'),             false, false, 'plaid', 'pfc-v1'),

  -- BANK_FEES
  ('BANK_FEES_ATM_FEES',                        'ATM Fees',                        (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),
  ('BANK_FEES_FOREIGN_TRANSACTION_FEES',        'Foreign Transaction Fees',        (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),
  ('BANK_FEES_INSUFFICIENT_FUNDS',              'Insufficient Funds',              (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),
  ('BANK_FEES_INTEREST_CHARGE',                 'Interest Charge',                 (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),
  ('BANK_FEES_OVERDRAFT_FEES',                  'Overdraft Fees',                  (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),
  ('BANK_FEES_OTHER_BANK_FEES',                 'Other Bank Fees',                 (select id from finance.transaction_categories where code = 'BANK_FEES'),                 false, false, 'plaid', 'pfc-v1'),

  -- ENTERTAINMENT
  ('ENTERTAINMENT_CASINOS_AND_GAMBLING',        'Casinos & Gambling',              (select id from finance.transaction_categories where code = 'ENTERTAINMENT'),            false, true, 'plaid', 'pfc-v1'),
  ('ENTERTAINMENT_MUSIC_AND_AUDIO',             'Music & Audio',                   (select id from finance.transaction_categories where code = 'ENTERTAINMENT'),            false, true, 'plaid', 'pfc-v1'),
  ('ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS','Sporting Events, Amusement Parks & Museums', (select id from finance.transaction_categories where code = 'ENTERTAINMENT'), false, true, 'plaid', 'pfc-v1'),
  ('ENTERTAINMENT_TV_AND_MOVIES',               'TV & Movies',                     (select id from finance.transaction_categories where code = 'ENTERTAINMENT'),            false, true, 'plaid', 'pfc-v1'),
  ('ENTERTAINMENT_VIDEO_GAMES',                 'Video Games',                     (select id from finance.transaction_categories where code = 'ENTERTAINMENT'),            false, true, 'plaid', 'pfc-v1'),
  ('ENTERTAINMENT_OTHER_ENTERTAINMENT',         'Other Entertainment',             (select id from finance.transaction_categories where code = 'ENTERTAINMENT'),            false, true, 'plaid', 'pfc-v1'),

  -- FOOD_AND_DRINK
  ('FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR',       'Beer, Wine & Liquor',             (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_COFFEE',                     'Coffee',                          (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_FAST_FOOD',                  'Fast Food',                       (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_GROCERIES',                  'Groceries',                       (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_RESTAURANT',                 'Restaurants',                     (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_VENDING_MACHINES',           'Vending Machines',                (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),
  ('FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK',       'Other Food & Drink',              (select id from finance.transaction_categories where code = 'FOOD_AND_DRINK'),           false, true, 'plaid', 'pfc-v1'),

  -- GENERAL_MERCHANDISE
  ('GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS','Bookstores & Newsstands',      (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES','Clothing & Accessories',        (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_CONVENIENCE_STORES',    'Convenience Stores',              (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_DEPARTMENT_STORES',     'Department Stores',               (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_DISCOUNT_STORES',       'Discount Stores',                 (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_ELECTRONICS',           'Electronics',                     (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES',   'Gifts & Novelties',               (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_OFFICE_SUPPLIES',       'Office Supplies',                 (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',   'Online Marketplaces',             (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_PET_SUPPLIES',          'Pet Supplies',                    (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_SPORTING_GOODS',        'Sporting Goods',                  (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_SUPERSTORES',           'Superstores',                     (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_TOBACCO_AND_VAPE',      'Tobacco & Vape',                  (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE','Other General Merchandise',    (select id from finance.transaction_categories where code = 'GENERAL_MERCHANDISE'),      false, true, 'plaid', 'pfc-v1'),

  -- HOME_IMPROVEMENT
  ('HOME_IMPROVEMENT_FURNITURE',                'Furniture',                       (select id from finance.transaction_categories where code = 'HOME_IMPROVEMENT'),         false, true, 'plaid', 'pfc-v1'),
  ('HOME_IMPROVEMENT_HARDWARE',                 'Hardware',                        (select id from finance.transaction_categories where code = 'HOME_IMPROVEMENT'),         false, true, 'plaid', 'pfc-v1'),
  ('HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE',   'Repair & Maintenance',            (select id from finance.transaction_categories where code = 'HOME_IMPROVEMENT'),         false, true, 'plaid', 'pfc-v1'),
  ('HOME_IMPROVEMENT_SECURITY',                 'Security',                        (select id from finance.transaction_categories where code = 'HOME_IMPROVEMENT'),         false, true, 'plaid', 'pfc-v1'),
  ('HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT',   'Other Home Improvement',          (select id from finance.transaction_categories where code = 'HOME_IMPROVEMENT'),         false, true, 'plaid', 'pfc-v1'),

  -- MEDICAL
  ('MEDICAL_DENTAL_CARE',                       'Dental Care',                     (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_EYE_CARE',                          'Eye Care',                        (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_NURSING_CARE',                      'Nursing Care',                    (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_PHARMACIES_AND_SUPPLEMENTS',        'Pharmacies & Supplements',        (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_PRIMARY_CARE',                      'Primary Care',                    (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_VETERINARY_SERVICES',               'Veterinary Services',             (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),
  ('MEDICAL_OTHER_MEDICAL',                     'Other Medical',                   (select id from finance.transaction_categories where code = 'MEDICAL'),                  false, true, 'plaid', 'pfc-v1'),

  -- PERSONAL_CARE
  ('PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',    'Gyms & Fitness',                  (select id from finance.transaction_categories where code = 'PERSONAL_CARE'),            false, true, 'plaid', 'pfc-v1'),
  ('PERSONAL_CARE_HAIR_AND_BEAUTY',             'Hair & Beauty',                   (select id from finance.transaction_categories where code = 'PERSONAL_CARE'),            false, true, 'plaid', 'pfc-v1'),
  ('PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING',    'Laundry & Dry Cleaning',          (select id from finance.transaction_categories where code = 'PERSONAL_CARE'),            false, true, 'plaid', 'pfc-v1'),
  ('PERSONAL_CARE_OTHER_PERSONAL_CARE',         'Other Personal Care',             (select id from finance.transaction_categories where code = 'PERSONAL_CARE'),            false, true, 'plaid', 'pfc-v1'),

  -- GENERAL_SERVICES
  ('GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING','Accounting & Financial Planning', (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'), false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_AUTOMOTIVE',               'Automotive Services',             (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_CHILDCARE',                'Childcare',                       (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_CONSULTING_AND_LEGAL',     'Consulting & Legal',              (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_EDUCATION',                'Education',                       (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_INSURANCE',                'Insurance',                       (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_POSTAGE_AND_SHIPPING',     'Postage & Shipping',              (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_STORAGE',                  'Storage',                         (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),
  ('GENERAL_SERVICES_OTHER_GENERAL_SERVICES',   'Other General Services',          (select id from finance.transaction_categories where code = 'GENERAL_SERVICES'),         false, true, 'plaid', 'pfc-v1'),

  -- GOVERNMENT_AND_NON_PROFIT
  ('GOVERNMENT_AND_NON_PROFIT_DONATIONS',       'Donations',                       (select id from finance.transaction_categories where code = 'GOVERNMENT_AND_NON_PROFIT'),false, true, 'plaid', 'pfc-v1'),
  ('GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES','Government Departments & Agencies', (select id from finance.transaction_categories where code = 'GOVERNMENT_AND_NON_PROFIT'), false, true, 'plaid', 'pfc-v1'),
  ('GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT',     'Tax Payment',                     (select id from finance.transaction_categories where code = 'GOVERNMENT_AND_NON_PROFIT'),false, true, 'plaid', 'pfc-v1'),
  ('GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT','Other Government & Non-Profit', (select id from finance.transaction_categories where code = 'GOVERNMENT_AND_NON_PROFIT'), false, true, 'plaid', 'pfc-v1'),

  -- TRANSPORTATION
  ('TRANSPORTATION_BIKES_AND_SCOOTERS',         'Bikes & Scooters',                (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_GAS',                        'Gas',                             (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_PARKING',                    'Parking',                         (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_PUBLIC_TRANSIT',             'Public Transit',                  (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_TAXIS_AND_RIDE_SHARES',      'Taxis & Ride Shares',             (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_TOLLS',                      'Tolls',                           (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),
  ('TRANSPORTATION_OTHER_TRANSPORTATION',       'Other Transportation',            (select id from finance.transaction_categories where code = 'TRANSPORTATION'),           false, true, 'plaid', 'pfc-v1'),

  -- TRAVEL
  ('TRAVEL_FLIGHTS',                            'Flights',                         (select id from finance.transaction_categories where code = 'TRAVEL'),                   false, true, 'plaid', 'pfc-v1'),
  ('TRAVEL_LODGING',                            'Lodging',                         (select id from finance.transaction_categories where code = 'TRAVEL'),                   false, true, 'plaid', 'pfc-v1'),
  ('TRAVEL_RENTAL_CARS',                        'Rental Cars',                     (select id from finance.transaction_categories where code = 'TRAVEL'),                   false, true, 'plaid', 'pfc-v1'),
  ('TRAVEL_OTHER_TRAVEL',                       'Other Travel',                    (select id from finance.transaction_categories where code = 'TRAVEL'),                   false, true, 'plaid', 'pfc-v1'),

  -- RENT_AND_UTILITIES
  ('RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',    'Gas & Electricity',               (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_INTERNET_AND_CABLE',     'Internet & Cable',                (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_RENT',                   'Rent',                            (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT','Sewage & Waste Management',   (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_TELEPHONE',              'Telephone',                       (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_WATER',                  'Water',                           (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1'),
  ('RENT_AND_UTILITIES_OTHER_UTILITIES',        'Other Utilities',                 (select id from finance.transaction_categories where code = 'RENT_AND_UTILITIES'),       false, true, 'plaid', 'pfc-v1')
on conflict (code) do update set
  display_name   = excluded.display_name,
  parent_id      = excluded.parent_id,
  is_primary     = excluded.is_primary,
  is_outflow     = excluded.is_outflow,
  source         = excluded.source,
  source_version = excluded.source_version,
  is_active      = true,
  updated_at     = now();
