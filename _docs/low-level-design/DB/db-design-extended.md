# Phase 1 DB Design — Extended

Per-table column definitions, grouped by schema. Companion to [db-design.md](./db-design.md), which is the schema/table-name index.

Conventions:

- All timestamps are `timestamptz`.
- `created_at` defaults to `now()`; `updated_at` is maintained by a trigger.
- Primary keys use `int` for user/domain tables and `smallint` for seeded lookup tables.
- `user_id` columns reference `auth.users.id` (Supabase Auth) unless noted.
- Table headings are unqualified because each group is already nested under its schema.
- Seeded lookup tables live in the `lookup` schema.

## `app`

### `profiles` — 1 row per user

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `display_name` (text)
- `email` (text) — mirrored from `auth.users` for joins/RLS convenience
- `phone` (text, nullable)
- `avatar_url` (text, nullable) — defaults to OAuth provider photo (Google/Apple) on first sign-in; replaced with a Supabase Storage URL when the user uploads their own
- `country_id` (smallint, FK → `billing.countries.id`, nullable) — drives pricing & supported-country gating
- `currency_id` (smallint, FK → `lookup.currencies.id`, nullable) — primary spending currency; if null, derived from `country_id`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `onboarding_states` — 1 row per user

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `current_step_id` (smallint, FK → `lookup.onboarding_steps.id`)
- `card_connection_plaid` (boolean, default false)
- `card_connection_manual` (boolean, default false)
- `card_connection_skipped` (boolean, default false)
- `completed_at` (timestamptz, nullable) — set when the whole flow finishes
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `user_preferences` — 1 row per user

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `theme` (text, default `'system'`) — `'light' | 'dark' | 'system'`
- `locale` (text, default `'en-US'`)
- `timezone` (text) — IANA, e.g., `'America/Los_Angeles'`
- `hide_amounts` (boolean, default false) — masks `$` in UI for privacy
- `biometric_unlock_enabled` (boolean, default false) — preference; actual enrollment is device-side
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `user_permissions` — 1 row per user (latest reported state)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `location_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `camera_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `notification_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `last_reported_at` (timestamptz) — when the device last pushed state
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `user_device_permissions` — latest OS permission state per user device

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `device_id` (int, FK → `messaging.devices.id`)
- `location_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `camera_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `notification_permission_id` (smallint, FK → `lookup.permission_states.id`)
- `location_accuracy` (text, nullable) — e.g. `'full' | 'reduced'`
- `raw_platform_payload` (jsonb, nullable) — platform-specific permission details for iOS/Android
- `last_reported_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, device_id)`

## `catalog`

### `card_issuers` — issuer master data

- `id` (smallint, PK)
- `code` (text, unique) — `'chase'`, `'amex'`, `'citi'`
- `display_name` (text)
- `logo_url` (text, nullable)
- `is_active` (boolean, default true)
- `rewardscc_id` (text, nullable, unique) — external provider ID for CatalogSyncJob
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `card_products` — specific card products

- `id` (int, PK)
- `issuer_id` (smallint, FK → `catalog.card_issuers.id`)
- `network_id` (smallint, FK → `lookup.card_networks.id`)
- `reward_currency_id` (smallint, FK → `lookup.reward_currencies.id`)
- `code` (text, unique) — `'chase_sapphire_preferred'`
- `display_name` (text)
- `card_art_url` (text, nullable)
- `annual_fee` (numeric(10,2), nullable)
- `reward_currency_name` (text, nullable) — `'Ultimate Rewards'`, `'Membership Rewards'`
- `base_reward_rate` (numeric(6,4), default 1.0) — earn rate for uncategorized spend
- `rewardscc_id` (text, nullable, unique)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `card_product_requests` — user-submitted catalog additions for admin review

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `issuer_name` (text) — bank/issuer name as submitted by the user
- `card_name` (text) — card product name as submitted by the user
- `status` (text, default `'pending'`) — `'pending' | 'approved' | 'rejected' | 'merged'`
- `approved_issuer_id` (smallint, FK → `catalog.card_issuers.id`, nullable)
- `approved_card_product_id` (int, FK → `catalog.card_products.id`, nullable)
- `reviewed_by_user_id` (uuid, FK → `auth.users.id`, nullable)
- `reviewed_at` (timestamptz, nullable)
- `review_notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `categories` — unified category table (merchant + reward)

- `id` (smallint, PK)
- `code` (text, unique) — `'groceries'`, `'dining'`, `'electronics'`, `'travel'`
- `display_name` (text)
- `icon` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `category_aliases` — alternative names/codes/MCCs that resolve to a category

- `id` (int, PK)
- `category_id` (smallint, FK → `catalog.categories.id`)
- `alias` (text) — alternative name, code, or MCC value
- `source` (text, nullable) — `'plaid' | 'rewardscc' | 'apple_mapkit' | 'google_places' | 'mcc' | 'manual'`
- `created_at` (timestamptz)

### `reward_rules` — per-card-product earn rules

- `id` (int, PK)
- `card_product_id` (int, FK → `catalog.card_products.id`)
- `category_id` (smallint, FK → `catalog.categories.id`, nullable) — null means applies to base spend
- `multiplier` (numeric(6,4)) — `3.0` means 3x
- `cap_amount` (numeric(12,2), nullable) — spend cap before rate drops
- `cap_period_id` (smallint, FK → `lookup.cap_periods.id`, nullable)
- `start_date` (date, nullable) — for rotating categories
- `end_date` (date, nullable)
- `requires_activation` (boolean, default false)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## `finance`

### `plaid_items` — Plaid Item / institution connection

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `plaid_item_id` (text, unique) — Plaid's item ID
- `plaid_institution_id` (text)
- `institution_name` (text)
- `institution_logo_url` (text, nullable)
- `access_token_encrypted` (text) — encrypted at rest
- `status_id` (smallint, FK → `lookup.plaid_item_statuses.id`)
- `last_sync_at` (timestamptz, nullable)
- `transaction_sync_cursor` (text, nullable) — Plaid transactions/sync cursor
- `last_transaction_sync_at` (timestamptz, nullable)
- `last_error` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `plaid_accounts` — accounts within a Plaid item

- `id` (int, PK)
- `plaid_item_id` (int, FK → `finance.plaid_items.id`)
- `plaid_account_id` (text, unique)
- `account_name` (text)
- `mask` (text, nullable) — last 4
- `subtype` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `plaid_webhook_events` — idempotency log for inbound Plaid webhooks

- `id` (int, PK)
- `plaid_event_id` (text, unique) — provider-supplied or handler-derived dedup key
- `webhook_type` (text) — e.g. `'ITEM'`, `'TRANSACTIONS'`
- `webhook_code` (text) — e.g. `'NEW_ACCOUNTS_AVAILABLE'`, `'ITEM_LOGIN_REQUIRED'`, `'ERROR'`
- `plaid_item_id` (text, nullable) — Plaid's item ID from the payload
- `payload` (jsonb)
- `received_at` (timestamptz)
- `processed_at` (timestamptz, nullable)
- `processing_error` (text, nullable)
- `created_at` (timestamptz)

### `foursquare_webhook_events` — idempotency log for inbound Foursquare webhooks

Inbound webhook log for Foursquare geofence/place enter events. Mirrors `plaid_webhook_events` / `billing.stripe_webhook_events` shape so the same outbox + consumer pattern applies.

- `id` (int, PK)
- `foursquare_event_id` (text, unique) — Foursquare's `id` field; dedup key
- `event_type` (text) — e.g. `'user.entered_geofence'`, `'user.entered_place'`
- `foursquare_user_id` (text, nullable) — Foursquare's external user id (we set this to `auth.users.id`)
- `user_id` (uuid, FK → `auth.users.id`, nullable) — resolved from `foursquare_user_id`
- `merchant_id` (int, FK → `finance.merchants.id`, nullable) — resolved from place metadata
- `payload` (jsonb)
- `received_at` (timestamptz)
- `processed_at` (timestamptz, nullable)
- `processing_error` (text, nullable)
- `created_at` (timestamptz)

### `user_cards` — user's cards (linked + manual)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `card_product_id` (int, FK → `catalog.card_products.id`, nullable) — null if unknown product
- `catalog_request_id` (int, FK → `catalog.card_product_requests.id`, nullable) — pending/approved catalog request for custom manual cards
- `plaid_account_id` (int, FK → `finance.plaid_accounts.id`, nullable) — null for manual
- `source_id` (smallint, FK → `lookup.card_sources.id`)
- `sync_status` (text, default `'active'`) — `'active' | 'login_required' | 'error' | 'disconnected'`; used for Plaid-backed cards and shown as disconnected after Plaid disconnect
- `custom_issuer_name` (text, nullable) — used when `card_product_id` is null
- `custom_card_name` (text, nullable) — used when `card_product_id` is null
- `nickname` (text, nullable)
- `last_four` (text, nullable)
- `is_primary` (boolean, default false)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `card_reward_overrides` — per-user overrides on a card's reward rules

- `id` (int, PK)
- `user_card_id` (int, FK → `finance.user_cards.id`)
- `category_id` (smallint, FK → `catalog.categories.id`, nullable) — null = base rate override
- `multiplier` (numeric(6,4))
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `merchants` — merchant master (resolved server-side from MapKit/Places hits)

- `id` (int, PK)
- `canonical_name` (text)
- `normalized_name` (text) — for dedup matching
- `category_id` (smallint, FK → `catalog.categories.id`, nullable)
- `mapkit_place_id` (text, nullable, unique)
- `google_place_id` (text, nullable, unique)
- `lat` (numeric, nullable)
- `lng` (numeric, nullable)
- `address` (text, nullable)
- `is_multi_category` (boolean, default false) — drives the coverage warning
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `merchant_visits` — user-merchant interactions (powers smart-default category)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `merchant_id` (int, FK → `finance.merchants.id`)
- `selected_category_id` (smallint, FK → `catalog.categories.id`, nullable)
- `visited_at` (timestamptz)
- `created_at` (timestamptz)

### `recommendations` — recommendation results

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `merchant_id` (int, FK → `finance.merchants.id`, nullable) — null for home tab
- `recommended_user_card_id` (int, FK → `finance.user_cards.id`)
- `category_id` (smallint, FK → `catalog.categories.id`, nullable)
- `expected_reward_rate` (numeric(6,4), nullable)
- `expected_reward_amount` (numeric(10,2), nullable)
- `context_id` (smallint, FK → `lookup.recommendation_contexts.id`)
- `generated_at` (timestamptz)
- `created_at` (timestamptz)

### `transactions` — user transactions (manual + Plaid-imported)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `source` (text, default `'manual'`) — `'manual' | 'plaid'`
- `plaid_transaction_id` (text, nullable, unique) — Plaid transaction ID for idempotent import
- `plaid_account_id` (int, FK → `finance.plaid_accounts.id`, nullable)
- `user_card_id` (int, FK → `finance.user_cards.id`)
- `merchant_id` (int, FK → `finance.merchants.id`, nullable)
- `category_id` (smallint, FK → `catalog.categories.id`, nullable)
- `amount` (numeric(12,2))
- `transaction_date` (date)
- `transaction_time` (time, nullable)
- `is_pending` (boolean, default false)
- `description` (text, nullable)
- `location_label` (text, nullable)
- `location_lat` (numeric, nullable)
- `location_lng` (numeric, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `transaction_reward_results` — computed reward per transaction

- `id` (int, PK)
- `transaction_id` (int, FK → `finance.transactions.id`, unique)
- `earned_rate` (numeric(6,4))
- `earned_amount` (numeric(12,4))
- `reward_currency_id` (smallint, FK → `lookup.reward_currencies.id`)
- `rule_applied_id` (int, FK → `catalog.reward_rules.id`, nullable)
- `computed_at` (timestamptz)
- `created_at` (timestamptz)

### `missed_reward_events` — "you could've earned more"

- `id` (int, PK)
- `transaction_id` (int, FK → `finance.transactions.id`, unique)
- `better_user_card_id` (int, FK → `finance.user_cards.id`)
- `actual_reward_amount` (numeric(12,4))
- `potential_reward_amount` (numeric(12,4))
- `missed_amount` (numeric(12,4))
- `is_dismissed` (boolean, default false) — user marked "not a miss"
- `detected_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `location_events` — raw location samples (for privacy export/clear)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `lat` (numeric)
- `lng` (numeric)
- `accuracy_meters` (numeric, nullable)
- `merchant_id` (int, FK → `finance.merchants.id`, nullable)
- `event_type_id` (smallint, FK → `lookup.location_event_types.id`)
- `occurred_at` (timestamptz)
- `created_at` (timestamptz)

## `billing`

### `countries` — supported countries

- `id` (smallint, PK)
- `code` (char(2), unique) — ISO 3166-1 alpha-2: `'US'`, `'GB'`, `'DE'`
- `display_name` (text)
- `currency_id` (smallint, FK → `lookup.currencies.id`)
- `is_supported` (boolean, default false) — per-country rollout toggle
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `plans` — slim plan identity

- `id` (smallint, PK)
- `code` (text, unique) — `'free' | 'basic' | 'pro'`
- `display_name` (text)
- `description` (text, nullable)
- `trial_days` (smallint, default 0) — Free 0, Basic 7, Pro 14
- `stripe_product_id` (text, nullable) — one Stripe Product per plan
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `plan_prices` — mapping: plan × country × period → price

- `id` (int, PK)
- `plan_id` (smallint, FK → `billing.plans.id`)
- `country_id` (smallint, FK → `billing.countries.id`)
- `period_id` (smallint, FK → `lookup.periods.id`)
- `price` (numeric(10,2))
- `stripe_price_id` (text, nullable, unique) — region/period-specific Stripe Price
- `effective_from` (date, nullable)
- `effective_to` (date, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(plan_id, country_id, period_id, effective_from)`

### `features` — feature catalog

- `id` (smallint, PK)
- `code` (text, unique) — `'manual_card_limit'`, `'plaid_card_limit'`, `'geo_recommendations_per_day'`, `'ai_insights_enabled'`
- `display_name` (text)
- `description` (text, nullable)
- `value_type` (text) — `'integer' | 'boolean' | 'string'`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `plan_features` — mapping: plan → feature value

- `id` (int, PK)
- `plan_id` (smallint, FK → `billing.plans.id`)
- `feature_id` (smallint, FK → `billing.features.id`)
- `value` (text) — parsed per `features.value_type`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(plan_id, feature_id)`

### `subscriptions` — user's active/past subscription

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `plan_id` (smallint, FK → `billing.plans.id`)
- `plan_price_id` (int, FK → `billing.plan_prices.id`)
- `stripe_subscription_id` (text, unique)
- `status_id` (smallint, FK → `lookup.subscription_statuses.id`)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `trial_end` (timestamptz, nullable)
- `cancel_at_period_end` (boolean, default false)
- `canceled_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `stripe_customers` — maps user → Stripe customer

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `stripe_customer_id` (text, unique)
- `email` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `payment_methods` — cached from Stripe

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `stripe_payment_method_id` (text, unique)
- `type_id` (smallint, FK → `lookup.payment_method_types.id`)
- `card_brand` (text, nullable) — `'visa'`, `'mastercard'`, `'amex'`, `'discover'`
- `last_four` (text, nullable)
- `exp_month` (smallint, nullable)
- `exp_year` (smallint, nullable)
- `is_default` (boolean, default false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `stripe_webhook_events` — idempotency log for inbound webhooks

- `id` (int, PK)
- `stripe_event_id` (text, unique)
- `event_type` (text)
- `payload` (jsonb)
- `received_at` (timestamptz)
- `processed_at` (timestamptz, nullable)
- `processing_error` (text, nullable)
- `created_at` (timestamptz)

## `messaging`

### `devices` — registered push devices

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `platform_id` (smallint, FK → `lookup.device_platforms.id`)
- `push_token` (text, nullable, unique) — APNs or FCM token; null before notification permission/token is available
- `device_name` (text, nullable)
- `app_version` (text, nullable)
- `os_version` (text, nullable)
- `locale` (text, nullable)
- `timezone` (text, nullable) — IANA, e.g. `'America/New_York'`
- `is_active` (boolean, default true)
- `last_seen_at` (timestamptz)
- `registered_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_preferences` — master toggles per user

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `master_enabled` (boolean, default true) — kill switch
- `push_enabled` (boolean, default true)
- `email_enabled` (boolean, default true)
- `quiet_hours_enabled` (boolean, default false)
- `quiet_hours_start` (time, nullable)
- `quiet_hours_end` (time, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_types` — catalog of notification categories

- `id` (smallint, PK)
- `code` (text, unique) — `'best_card_alert'`, `'missed_rewards'`, `'weekly_summary'`, `'unusual_transaction'`, `'subscription_expiry'`, `'system'`
- `display_name` (text)
- `description` (text, nullable)
- `default_enabled` (boolean, default true)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_type_preferences` — per-user × per-type toggle

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `notification_type_id` (smallint, FK → `messaging.notification_types.id`)
- `is_enabled` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, notification_type_id)`

### `notifications` — notification records

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `notification_type_id` (smallint, FK → `messaging.notification_types.id`)
- `title` (text)
- `body` (text)
- `related_transaction_id` (int, FK → `finance.transactions.id`, nullable)
- `related_missed_reward_event_id` (int, FK → `finance.missed_reward_events.id`, nullable)
- `payload` (jsonb, nullable) — for deep-link refs not covered by the explicit FKs
- `is_read` (boolean, default false)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_reminders` — user-scheduled reminders ("remind me later")

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `source_notification_id` (int, FK → `messaging.notifications.id`, nullable)
- `remind_at` (timestamptz)
- `title` (text)
- `body` (text)
- `is_fired` (boolean, default false)
- `fired_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_deliveries` — delivery attempts (APNs/FCM/email)

- `id` (int, PK)
- `notification_id` (int, FK → `messaging.notifications.id`)
- `device_id` (int, FK → `messaging.devices.id`, nullable) — null for email
- `channel_id` (smallint, FK → `lookup.notification_channels.id`)
- `status_id` (smallint, FK → `lookup.delivery_statuses.id`)
- `external_id` (text, nullable) — APNs/FCM/email provider message ID
- `error_code` (text, nullable)
- `error_message` (text, nullable)
- `attempted_at` (timestamptz)
- `delivered_at` (timestamptz, nullable)
- `next_attempt_at` (timestamptz, nullable) — when retry should run
- `attempt_count` (smallint, default 0)
- `created_at` (timestamptz)

### `event_outbox` — domain events queued for async fan-out (transactional outbox)

- `id` (int, PK)
- `event_type` (text) — `domain.entity.action` format, e.g. `'finance.transaction.created'`
- `aggregate_type` (text) — e.g. `'transaction'`, `'user_card'`, `'subscription'`, `'plaid_item'`
- `aggregate_id` (int) — polymorphic reference, resolved via `aggregate_type`
- `user_id` (uuid, FK → `auth.users.id`, nullable) — for user-scoped events
- `payload` (jsonb) — opaque to outbox; include `payload.version` for forward compatibility
- `idempotency_key` (text, nullable, unique) — caller-supplied dedup (e.g. `clientGeneratedId`)
- `status_id` (smallint, FK → `lookup.event_outbox_statuses.id`)
- `attempt_count` (int, default 0) — dispatch sweep attempts
- `last_error` (text, nullable)
- `created_at` (timestamptz) — written in the same DB tx as the source change
- `available_at` (timestamptz, default `now()`) — for delayed events
- `dispatched_at` (timestamptz, nullable) — first dispatch that created deliveries
- `processed_at` (timestamptz, nullable) — set when all subscribed deliveries are terminal

### `event_subscriptions` — registry of consumers per event type (seeded + admin-editable)

- `id` (smallint, PK)
- `event_type` (text)
- `consumer_name` (text) — e.g. `'MissedRewardNotificationProducer'`, `'AnalyticsRecomputeConsumer'`
- `is_active` (boolean, default true)
- `max_retries` (smallint, default 5)
- `retry_backoff_seconds` (int, default 60) — base for exponential backoff
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(event_type, consumer_name)`

### `event_deliveries` — per-consumer delivery attempt for an event_outbox row

- `id` (int, PK)
- `event_outbox_id` (int, FK → `messaging.event_outbox.id`)
- `consumer_name` (text)
- `status_id` (smallint, FK → `lookup.event_delivery_statuses.id`)
- `attempt_count` (smallint, default 0)
- `next_attempt_at` (timestamptz, nullable)
- `last_attempted_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(event_outbox_id, consumer_name)`

## `insights`

### `analytics_snapshots` — precomputed rewards/missed aggregates (read-model)

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `period_id` (smallint, FK → `lookup.analytics_periods.id`)
- `period_start` (date)
- `period_end` (date)
- `total_earned` (numeric(12,4))
- `total_missed` (numeric(12,4))
- `transaction_count` (int)
- `top_categories` (jsonb, nullable) — pre-rendered breakdown
- `daily_breakdown` (jsonb, nullable) — pre-rendered daily chart points
- `computed_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, period_id, period_start)`

### `insight_generation_runs` — audit of AI generation jobs

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `status_id` (smallint, FK → `lookup.generation_statuses.id`)
- `model_name` (text, nullable) — Azure OpenAI deployment name
- `prompt_version` (text, nullable)
- `input_token_count` (int, nullable)
- `output_token_count` (int, nullable)
- `cost_estimate` (numeric(10,6), nullable) — USD
- `error_message` (text, nullable)
- `started_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `ai_insights` — Azure OpenAI-generated insights

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `generation_run_id` (int, FK → `insights.insight_generation_runs.id`)
- `insight_type_id` (smallint, FK → `lookup.ai_insight_types.id`)
- `priority_id` (smallint, FK → `lookup.priority_levels.id`, nullable)
- `title` (text)
- `body` (text)
- `payload` (jsonb, nullable) — structured data backing the insight
- `is_dismissed` (boolean, default false)
- `dismissed_at` (timestamptz, nullable)
- `generated_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## `sync`

### `states` — per-user × per-device × per-entity sync cursor

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `device_id` (int, FK → `messaging.devices.id`)
- `entity_type_id` (smallint, FK → `lookup.entity_types.id`)
- `last_synced_at` (timestamptz, nullable)
- `last_cursor` (text, nullable) — opaque cursor/version stamp
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, device_id, entity_type_id)`

### `outbox` — outgoing changes queued from device

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `device_id` (int, FK → `messaging.devices.id`)
- `entity_type_id` (smallint, FK → `lookup.entity_types.id`)
- `entity_id` (int) — polymorphic reference (resolved via `entity_type_id` in app code)
- `operation_id` (smallint, FK → `lookup.operations.id`)
- `payload` (jsonb)
- `status_id` (smallint, FK → `lookup.outbox_statuses.id`)
- `attempt_count` (int, default 0)
- `last_error` (text, nullable)
- `queued_at` (timestamptz)
- `processed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `conflicts` — conflicts requiring resolution

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `entity_type_id` (smallint, FK → `lookup.entity_types.id`)
- `entity_id` (int)
- `local_payload` (jsonb)
- `remote_payload` (jsonb)
- `resolution_id` (smallint, FK → `lookup.conflict_resolutions.id`, nullable) — null until resolved
- `resolved_at` (timestamptz, nullable)
- `resolved_by_user_id` (uuid, FK → `auth.users.id`, nullable)
- `detected_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `events` — audit log of sync activity

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `device_id` (int, FK → `messaging.devices.id`, nullable)
- `event_type_id` (smallint, FK → `lookup.event_types.id`)
- `entity_type_id` (smallint, FK → `lookup.entity_types.id`, nullable)
- `payload` (jsonb, nullable)
- `occurred_at` (timestamptz)
- `created_at` (timestamptz)

## `lookup`

### `onboarding_steps` — app onboarding flow steps (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'welcome' | 'card_connection' | 'location_permission' | 'plan_selection' | 'notifications' | 'completed'`
- `display_name` (text)
- `step_order` (smallint) — sequence in the flow
- `created_at` (timestamptz)

### `permission_states` — app/device permission states (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'not_determined' | 'denied' | 'restricted' | 'authorized' | 'authorized_when_in_use' | 'authorized_always' | 'authorized_once' | 'provisional' | 'limited'`
- `display_name` (text)
- `created_at` (timestamptz)

### `card_networks` — card payment networks (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'visa' | 'mastercard' | 'amex' | 'discover'`
- `display_name` (text)
- `created_at` (timestamptz)

### `reward_currencies` — card reward currency types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'cashback' | 'points' | 'miles'`
- `display_name` (text)
- `created_at` (timestamptz)

### `cap_periods` — reward cap reset periods (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'monthly' | 'quarterly' | 'annual'`
- `display_name` (text)
- `created_at` (timestamptz)

### `plaid_item_statuses` — Plaid connection statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'active' | 'login_required' | 'error' | 'disconnected'`
- `display_name` (text)
- `created_at` (timestamptz)

### `card_sources` — user card source types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'plaid' | 'manual'`
- `display_name` (text)
- `created_at` (timestamptz)

### `recommendation_contexts` — recommendation entry points (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'home' | 'in_store' | 'geofence_arrival'`
- `display_name` (text)
- `created_at` (timestamptz)

### `location_event_types` — location sample event types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'stop' | 'visit' | 'recommendation_request' | 'geofence_entered'`
- `display_name` (text)
- `created_at` (timestamptz)

### `currencies` — supported currency codes (seeded)

- `id` (smallint, PK)
- `code` (char(3), unique) — `'USD'`, `'EUR'`, `'GBP'`, `'CAD'`
- `display_name` (text)
- `symbol` (text) — `'$'`, `'€'`, `'£'`
- `created_at` (timestamptz)

### `periods` — billing periods (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'monthly' | 'annual'`
- `display_name` (text)
- `created_at` (timestamptz)

### `subscription_statuses` — subscription lifecycle statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'paused'`
- `display_name` (text)
- `created_at` (timestamptz)

### `payment_method_types` — payment method types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'card' | 'apple_pay' | 'google_pay' | 'link'`
- `display_name` (text)
- `created_at` (timestamptz)

### `device_platforms` — push device platforms (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'ios' | 'android'`
- `display_name` (text)
- `created_at` (timestamptz)

### `notification_channels` — notification delivery channels (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'push' | 'email' | 'in_app'`
- `display_name` (text)
- `created_at` (timestamptz)

### `delivery_statuses` — notification delivery statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'pending' | 'sent' | 'failed' | 'bounced'`
- `display_name` (text)
- `created_at` (timestamptz)

### `analytics_periods` — analytics aggregation periods (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'week' | 'month' | 'quarter' | 'year'`
- `display_name` (text)
- `created_at` (timestamptz)

### `generation_statuses` — AI generation statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'queued' | 'running' | 'completed' | 'failed' | 'cancelled'`
- `display_name` (text)
- `created_at` (timestamptz)

### `ai_insight_types` — AI insight categories (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'reward_optimization'`, `'spending_pattern'`, `'nudge'`, `'card_recommendation'`
- `display_name` (text)
- `description` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `priority_levels` — priority levels (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'low' | 'medium' | 'high'`
- `display_name` (text)
- `created_at` (timestamptz)

### `entity_types` — sync entity types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'transactions'`, `'user_cards'`, `'card_reward_overrides'`, `'notifications'`, `'notification_reminders'`
- `display_name` (text)
- `created_at` (timestamptz)

### `operations` — sync operations (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'create' | 'update' | 'delete'`
- `display_name` (text)
- `created_at` (timestamptz)

### `outbox_statuses` — sync outbox statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'pending' | 'processing' | 'succeeded' | 'failed' | 'conflict'`
- `display_name` (text)
- `created_at` (timestamptz)

### `event_outbox_statuses` — messaging event outbox statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'queued' | 'dispatched' | 'succeeded' | 'partially_failed' | 'failed'`
- `display_name` (text)
- `created_at` (timestamptz)

### `event_delivery_statuses` — per-consumer event delivery statuses (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'pending' | 'processing' | 'succeeded' | 'failed' | 'dead_lettered'`
- `display_name` (text)
- `created_at` (timestamptz)

### `conflict_resolutions` — sync conflict resolution outcomes (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'local_wins' | 'remote_wins' | 'merged'`
- `display_name` (text)
- `created_at` (timestamptz)

### `event_types` — sync event types (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'pull_started'`, `'pull_completed'`, `'push_started'`, `'push_completed'`, `'conflict_detected'`, `'conflict_resolved'`, `'retry_scheduled'`
- `display_name` (text)
- `created_at` (timestamptz)

### `roles` — security roles (seeded)

- `id` (smallint, PK)
- `code` (text, unique) — `'user' | 'developer' | 'admin'`
- `display_name` (text)
- `description` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## `privacy`

### `settings` — 1 row per user

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, unique)
- `anonymous_analytics_enabled` (boolean, default true) — controls privacy-preserving product analytics
- `personalized_ai_insights_enabled` (boolean, default true) — gates Azure OpenAI insight generation
- `location_history_enabled` (boolean, default true) — controls retention of `finance.location_events`
- `data_sharing_for_improvement_enabled` (boolean, default false) — opt-in for aggregated product improvement datasets
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `data_export_requests` — user-requested data exports

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `format` (text, default `'json'`) — `'json' | 'csv'`
- `status` (text, default `'queued'`) — `'queued' | 'processing' | 'completed' | 'failed' | 'expired'`
- `export_url` (text, nullable) — signed storage URL or object key
- `expires_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `failed_at` (timestamptz, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `account_deletion_requests` — account deletion grace-period queue

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `status` (text, default `'pending'`) — `'pending' | 'cancelled' | 'purged' | 'failed'`
- `requested_at` (timestamptz)
- `purge_after` (timestamptz) — hard-delete eligibility after the grace period
- `cancelled_at` (timestamptz, nullable)
- `purged_at` (timestamptz, nullable)
- `purge_attempt_count` (int, default 0)
- `last_error` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, status)` where `status = 'pending'`

### `location_deletion_requests` — location history deletion jobs

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `delete_before` (timestamptz, nullable) — null means delete all retained location history
- `status` (text, default `'queued'`) — `'queued' | 'processing' | 'completed' | 'failed'`
- `deleted_event_count` (int, default 0)
- `completed_at` (timestamptz, nullable)
- `failed_at` (timestamptz, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `audit_events` — privacy/compliance audit trail

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`, nullable) — affected user, if applicable
- `actor_user_id` (uuid, FK → `auth.users.id`, nullable) — admin or user who initiated the action
- `event_type` (text) — `'data_export.requested'`, `'account_deletion.cancelled'`, etc.
- `subject_type` (text, nullable) — table/domain object name
- `subject_id` (int, nullable) — polymorphic reference resolved by `subject_type`
- `metadata` (jsonb, nullable) — scrubbed details for compliance review
- `ip_address_hash` (text, nullable) — hashed for privacy compliance
- `user_agent` (text, nullable)
- `occurred_at` (timestamptz)
- `created_at` (timestamptz)

## `security`

### `user_roles` — user role grants

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `role_id` (smallint, FK → `lookup.roles.id`)
- `granted_by_user_id` (uuid, FK → `auth.users.id`, nullable)
- `granted_at` (timestamptz)
- `expires_at` (timestamptz, nullable)
- `revoked_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, role_id)` where `revoked_at is null`

### `feature_flags` — table-driven feature gates

- `id` (int, PK)
- `code` (text, unique) — `'ai_insights_enabled'`, `'receipt_ocr_enabled'`
- `display_name` (text)
- `description` (text, nullable)
- `is_enabled` (boolean, default false)
- `config` (jsonb, nullable) — provider limits, rollout metadata, or fallback config
- `rollout_percentage` (numeric(5,2), default 0.00)
- `starts_at` (timestamptz, nullable)
- `ends_at` (timestamptz, nullable)
- `created_by_user_id` (uuid, FK → `auth.users.id`, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `user_feature_flags` — per-user feature flag overrides

- `id` (int, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `feature_flag_id` (int, FK → `security.feature_flags.id`)
- `is_enabled` (boolean)
- `config_override` (jsonb, nullable)
- `assigned_by_user_id` (uuid, FK → `auth.users.id`, nullable)
- `expires_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- **Unique:** `(user_id, feature_flag_id)`
