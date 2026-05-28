# Phase 1 DB Design

## Schemas

- `app`
- `catalog`
- `finance`
- `billing`
- `messaging`
- `insights`
- `sync`
- `lookup`
- `privacy`
- `security`

## Tables

### `app` - 4

- `profiles`
- `onboarding_states`
- `user_preferences`
- `user_permissions`

### `catalog` - 5

- `card_issuers`
- `card_products`
- `categories`
- `category_aliases`
- `reward_rules`

### `finance` - 11

- `plaid_items`
- `plaid_accounts`
- `user_cards`
- `card_reward_overrides`
- `merchants`
- `merchant_visits`
- `recommendations`
- `manual_transactions`
- `transaction_reward_results`
- `missed_reward_events`
- `location_events`

### `billing` - 9

- `countries`
- `plans`
- `plan_prices`
- `features`
- `plan_features`
- `subscriptions`
- `stripe_customers`
- `payment_methods`
- `stripe_webhook_events`

### `messaging` - 7

- `devices`
- `notification_preferences`
- `notification_types`
- `notification_type_preferences`
- `notifications`
- `notification_reminders`
- `notification_deliveries`

### `insights` - 3

- `analytics_snapshots`
- `insight_generation_runs`
- `ai_insights`

### `sync` - 4

- `states`
- `outbox`
- `conflicts`
- `events`

### `lookup` - 26

- `onboarding_steps`
- `permission_states`
- `card_networks`
- `reward_currencies`
- `cap_periods`
- `plaid_item_statuses`
- `card_sources`
- `recommendation_contexts`
- `location_event_types`
- `currencies`
- `periods`
- `subscription_statuses`
- `payment_method_types`
- `device_platforms`
- `notification_channels`
- `delivery_statuses`
- `analytics_periods`
- `generation_statuses`
- `ai_insight_types`
- `priority_levels`
- `entity_types`
- `operations`
- `outbox_statuses`
- `conflict_resolutions`
- `event_types`
- `roles`

### `privacy` - 5

- `settings`
- `data_export_requests`
- `account_deletion_requests`
- `location_deletion_requests`
- `audit_events`

### `security` - 3

- `user_roles`
- `feature_flags`
- `user_feature_flags`

## Total

- Schemas: 10
- Tables: 77
