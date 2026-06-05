insert into messaging.event_subscriptions (event_type, consumer_name, is_active, max_retries, retry_backoff_seconds)
values
  ('billing.subscription.updated',        'EntitlementCacheInvalidator',              true, 5, 30),
  ('billing.payment_method.updated',      'BillingPaymentMethodCacheInvalidator',     true, 5, 30),
  ('finance.user_card.created',           'UserCardCreatedConsumer',                  true, 5, 30),
  ('catalog.card_product_request.created','CardProductRequestCreatedConsumer',        true, 5, 30),
  ('finance.merchant_visit.created',      'MerchantVisitCreatedConsumer',             true, 5, 30),
  ('finance.reward_override.upserted',    'RewardOverrideUpsertedConsumer',           true, 5, 30),
  ('finance.reward_override.deleted',     'RewardOverrideDeletedConsumer',            true, 5, 30),
  ('finance.plaid_connection.disconnected','PlaidConnectionDisconnectedConsumer',     true, 5, 30),
  ('finance.transaction.created',         'AnalyticsRecomputeConsumer',               true, 5, 30),
  ('finance.transaction.imported',        'AnalyticsRecomputeConsumer',               true, 5, 30),
  ('finance.transaction.updated',         'AnalyticsRecomputeConsumer',               true, 5, 30),
  ('finance.transaction.deleted',         'AnalyticsRecomputeConsumer',               true, 5, 30),
  ('finance.missed_reward.not_a_miss',    'AnalyticsRecomputeConsumer',               true, 5, 30),
  ('messaging.notification.created',      'PushFanOutConsumer',                       true, 5, 30),
  ('messaging.notification.created',      'InboxCacheInvalidator',                    true, 5, 30),
  ('messaging.notification.read',         'NotificationReadConsumer',                 true, 5, 30),
  ('messaging.notifications.read_all',    'NotificationsReadAllConsumer',             true, 5, 30),
  ('insights.ai_generation.completed',    'AIInsightsCacheInvalidator',               true, 5, 30),
  ('finance.plaid_item.status_changed',   'PlaidReauthNotificationProducer',          true, 5, 30),
  ('finance.plaid_item.status_changed',   'CardsCacheInvalidator',                    true, 5, 30),
  ('finance.plaid_item.new_accounts_available', 'PlaidNewAccountsNotificationProducer', true, 5, 30),
  ('finance.missed_reward_event.created', 'MissedRewardNotificationProducer',         true, 5, 30)
on conflict (event_type, consumer_name) do update set
  is_active = excluded.is_active,
  max_retries = excluded.max_retries,
  retry_backoff_seconds = excluded.retry_backoff_seconds,
  updated_at = now();
