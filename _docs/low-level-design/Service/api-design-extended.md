# Phase 1 API Contracts

Only mobile Phase 1 screen contracts are listed. All writes use `POST`.

## Auth Bootstrap

### `POST /api/v1/auth/bootstrap`

Request: `AuthBootstrapRequest`

- `locale`
- `timezone`
- `countryCode`
- `device.platformCode`
- `device.pushToken` (nullable)
- `device.deviceName`
- `device.appVersion`
- `device.osVersion`

Response: `AuthBootstrapResponse`

- `profile`
- `preferences`
- `permissions`
- `onboarding`
- `entitlements`
- `roles`
- `deviceId`

Behavior: requires a valid Supabase JWT, derives `user_id` from the token, creates missing first-login rows, upserts the current `messaging.devices` row when device metadata is supplied, and returns the initial app state for mobile cache hydration.

## Shared View Models

### `LookupVm`

- `id`
- `code`
- `displayName`

### `MoneyVm`

- `amount`
- `currencyCode`
- `display`

### `CardSummaryVm`

- `id`
- `displayName`
- `issuerName`
- `lastFour`
- `source`
- `isPrimary`
- `syncStatus`
- `cardArtUrl`

### `CardLimitsResponse`

- `plaidUsed` (integer)
- `plaidLimit` (integer, nullable when unlimited)
- `manualUsed` (integer)
- `manualLimit` (integer, nullable when unlimited)
- `unlimited` (boolean)

### `CardTermsVm`

- `annualFee`
- `purchaseApr`
- `foreignTransactionFee`
- `termsSummary`

### `MonthlyRewardContributionVm`

- `points`
- `estimatedValue`
- `currencyCode`
- `periodLabel`

### `RewardRuleVm`

- `categoryCode`
- `categoryName`
- `multiplier`
- `capDisplay`
- `notes`

### `RecommendationCardVm`

- `card`
- `expectedRewardRate`
- `expectedReward`
- `reason`
- `rank`

### `MerchantVm`

- `id`
- `name`
- `categoryCode`
- `isMultiCategory`
- `address`

### `RecommendationVm`

- `id`
- `merchant`
- `categoryCode`
- `recommendedCard`
- `reason`
- `runnerUpCards`
- `coverageWarning`

### `TransactionVm`

- `id`
- `merchantName`
- `amount`
- `card`
- `categoryCode`
- `categoryName`
- `transactionDate`
- `transactionTime`
- `locationLabel`
- `source`
- `isPending`
- `earnedReward`
- `missedReward`
- `syncStatus`

### `NotificationVm`

- `id`
- `typeCode`
- `title`
- `body`
- `isRead`
- `createdAt`
- `relatedTransactionId`
- `relatedMissedRewardEventId`

### `PlanVm`

- `id`
- `code`
- `displayName`
- `description`
- `monthlyPrice`
- `annualPrice`
- `trialDays`
- `features`
- `isCurrent`

### `PlaidConnectionVm`

- `id`
- `institutionName`
- `institutionLogoUrl`
- `status`
- `lastSyncAt`
- `cardCount`

### `IssuerVm`

- `id`
- `displayName`
- `logoUrl`

### `CardProductVm`

- `id`
- `issuerName`
- `displayName`
- `cardArtUrl`
- `annualFee`
- `rewardCurrencyName`

### `CategoryVm`

- `id`
- `code`
- `displayName`
- `icon`

### `MissedRewardVm`

- `id`
- `transactionId`
- `merchantName`
- `actualCard`
- `betterCard`
- `actualReward`
- `potentialReward`
- `missedReward`
- `isDismissed`

### `RewardBreakdownItemVm`

Shared shape for `RewardsSummaryResponse.dailyBreakdown` (one row per day) and `RewardsSummaryResponse.categoryBreakdown` (one row per category).

- `key` — ISO date for daily, category code for category
- `label` — human-readable label (e.g. `'Mon May 25'`, `'Dining'`)
- `earned` (`MoneyVm`)
- `missed` (`MoneyVm`)

### `AIInsightVm`

- `id`
- `typeCode`
- `priority`
- `title`
- `body`
- `generatedAt`

### `NotificationTypeVm`

- `code`
- `displayName`
- `enabled`

### `PaymentMethodVm`

- `id`
- `type`
- `cardBrand`
- `lastFour`
- `isDefault`

### `PlanVm`

- `code` — `'basic' | 'pro'`
- `displayName`
- `description`
- `trialDays`

### `PlanPriceVm`

- `planCode`
- `countryCode`
- `periodCode` — from `lookup.periods`
- `amount` (`MoneyVm`)
- `stripePriceId` — opaque to the client, used by `POST /billing/checkout`

### `PlanFeatureVm`

- `code` — `'card_link_limit' | 'ai_insights_enabled' | …`
- `displayName`
- `description`
- `valueType` — `'integer' | 'boolean' | 'string'`
- `valuesByPlan` (`PlanFeatureValueVm[]`)

### `PlanFeatureValueVm`

- `planCode`
- `value` — string; parsed per the feature's `valueType`

### `SyncConflictVm`

- `id`
- `entityType`
- `entityId`
- `localPayload`
- `remotePayload`
- `detectedAt`

### `SyncEventVm`

One item in `SyncStatusResponse.recentEvents`. Drives the success/error/reconnect rows on screen 8.5.

- `type` — from `lookup.event_types.code` (`'pull_completed'`, `'push_completed'`, `'conflict_detected'`, `'conflict_resolved'`, `'retry_scheduled'`, …)
- `severity` — `'info' | 'warning' | 'error'`
- `message` — short human-readable summary
- `occurredAt`
- `action` — optional `{ code, label }` for tap-through (e.g. `code: 'reconnect_plaid'`, `label: 'Reconnect'`)

### `SyncCachedEntityCountVm`

One row per entity type in `SyncStatusResponse.cachedCounts`. Lets 8.5 show "120 transactions cached, 4 cards cached" instead of a single scalar.

- `entityType` — from `lookup.entity_types.code` (`'transactions'`, `'cards'`, `'notifications'`, `'notification_reminders'`, `'card_reward_overrides'`)
- `count`

## Profile

### `GET /api/v1/profile`

Response: `ProfileResponse`

- `displayName`
- `email`
- `phone`
- `avatarUrl` — provider photo (Google/Apple) by default; replaced with the user's uploaded photo URL after `POST /api/v1/profile/avatar`
- `countryCode`
- `currencyCode` — primary spending currency from `lookup.currencies`; falls back to the country's default when null in DB
- `currentPlanCode`

### `POST /api/v1/profile`

Request: `UpdateProfileRequest`

- `displayName`
- `phone`
- `countryCode`
- `currencyCode` — from `GET /api/v1/lookups/currencies`

Response: `ProfileResponse`

### `POST /api/v1/profile/avatar`

Multipart upload of a user-selected photo. Server stores the file in Supabase Storage and updates `app.profiles.avatar_url` with the resulting URL.

Request: multipart/form-data

- `file` (binary, required)

Response: `ProfileResponse`

## Preferences

### `GET /api/v1/preferences`

Response: `PreferencesResponse`

- `theme`
- `locale`
- `timezone`
- `hideAmounts`
- `biometricUnlockEnabled`

### `POST /api/v1/preferences`

Request: `UpdatePreferencesRequest`

- `theme`
- `locale`
- `timezone`
- `hideAmounts`
- `biometricUnlockEnabled`

Response: `PreferencesResponse`

## Permissions

### `GET /api/v1/permissions`

Response: `PermissionsResponse`

- `location`
- `camera`
- `notifications`
- `device`
- `lastReportedAt`

### `POST /api/v1/permissions`

Request: `UpdatePermissionsRequest`

- `deviceId`
- `platformCode`
- `location.state`
- `location.accuracy`
- `camera.state`
- `notifications.state`
- `rawPlatformPayload`

Response: `PermissionsResponse`

Behavior: writes `app.user_device_permissions` for the current device, updates the `app.user_permissions` user-level summary, and returns the canonical permission state for mobile cache replacement.

## Onboarding

### `GET /api/v1/onboarding`

Response: `OnboardingResponse`

- `currentStepCode`
- `cardConnectionPlaid`
- `cardConnectionManual`
- `cardConnectionSkipped`
- `completed`

### `POST /api/v1/onboarding`

Request: `UpdateOnboardingRequest`

- `currentStepCode`
- `cardConnectionPlaid`
- `cardConnectionManual`
- `cardConnectionSkipped`

Response: `OnboardingResponse`

### `POST /api/v1/onboarding/complete`

Request: empty

Response: `OnboardingResponse`

### `POST /api/v1/onboarding/skip-card-linking`

Request: empty

Response: `OnboardingResponse`

## Plaid

### `POST /api/v1/plaid/link-token`

Request: empty

Response: `PlaidLinkTokenResponse`

- `linkToken`
- `expiration`

### `POST /api/v1/plaid/exchange-token`

Request: `ExchangePlaidTokenRequest`

- `publicToken`

Response: `PlaidConnectionResponse`

- `connections`
- `cards`

Behavior: writes discovered `finance.user_cards` and durable outbox events for card/cache invalidation in the same transaction.

### `GET /api/v1/plaid/connections`

Response: `PlaidConnectionsResponse`

- `connections`

### `POST /api/v1/plaid/connections/sync`

Request: `SyncPlaidConnectionRequest`

- `connectionId`

Response: `PlaidConnectionResponse`

Behavior: writes durable outbox events for Plaid/card cache invalidation when local connection/card state changes.

### `POST /api/v1/plaid/connections/reconnect`

Request: `ReconnectPlaidConnectionRequest`

- `connectionId`

Response: `PlaidLinkTokenResponse`

### `POST /api/v1/plaid/connections/disconnect`

Request: `DisconnectPlaidConnectionRequest`

- `connectionId`

Response: `PlaidConnectionResponse`

Behavior: marks the Plaid connection disconnected and keeps related user cards active/visible with `syncStatus = disconnected`; writes durable outbox events for cards, connections, and recommendations.

### `POST /api/v1/plaid/transactions/sync`

Request: `SyncPlaidTransactionsRequest`

- `connectionId`
- `force`

Response: `PlaidTransactionSyncResponse`

- `connectionId`
- `importedCount`
- `updatedCount`
- `removedCount`
- `lastTransactionSyncAt`

Behavior: runs Plaid transactions/sync for the connection, upserts `finance.transactions` by `plaid_transaction_id`, updates `finance.plaid_items.transaction_sync_cursor`, computes reward/missed-reward rows, and writes transaction outbox events.

## Cards

### `GET /api/v1/cards`

Response: `CardsResponse`

- `cards`
- `limits`

### `GET /api/v1/cards/{cardId}`

Response: `CardDetailResponse`

- `card`
- `rewardRules`
- `monthlyRewardContribution`
- `terms`

### `POST /api/v1/cards/manual`

Request: `CreateManualCardRequest`

- `cardProductId`
- `issuerId`
- `nickname`
- `lastFour`
- `isPrimary`

Response: `CardDetailResponse`

Behavior: writes `finance.user_cards` and a durable outbox event for card/recommendation cache invalidation.

### `POST /api/v1/cards/{cardId}`

Request: `UpdateCardRequest`

- `nickname`
- `lastFour`
- `isPrimary`

Response: `CardDetailResponse`

Behavior: writes `finance.user_cards` and a durable outbox event for card/recommendation cache invalidation.

### `POST /api/v1/cards/{cardId}/delete`

Request: empty

Response: `CardsResponse`

Behavior: soft-deletes/deactivates the card and writes a durable outbox event for card/recommendation cache invalidation.

### `POST /api/v1/cards/{cardId}/primary`

Request: empty

Response: `CardsResponse`

Behavior: updates the primary-card flag and writes a durable outbox event for card/recommendation cache invalidation.

### `GET /api/v1/cards/limits`

Response: `CardLimitsResponse`

- `plaidUsed`
- `plaidLimit`
- `manualUsed`
- `manualLimit`
- `unlimited`

### `GET /api/v1/cards/{cardId}/reward-overrides`

Response: `RewardOverridesResponse`

- `rewardRules`

### `POST /api/v1/cards/{cardId}/reward-overrides`

Request: `UpsertRewardOverrideRequest`

- `categoryCode`
- `multiplier`
- `notes`

Response: `RewardOverridesResponse`

Behavior: writes `finance.card_reward_overrides` and a durable outbox event for card detail, recommendation, and transaction reward recalculation caches.

### `POST /api/v1/cards/{cardId}/reward-overrides/delete`

Request: `DeleteRewardOverrideRequest`

- `categoryCode`

Response: `RewardOverridesResponse`

Behavior: deletes or deactivates the override and writes a durable outbox event for card detail, recommendation, and transaction reward recalculation caches.

## Card Catalog

### `GET /api/v1/card-catalog/issuers`

Response: `IssuersResponse`

- `issuers`

### `GET /api/v1/card-catalog/products`

Response: `CardProductsResponse`

- `products`

### `GET /api/v1/card-catalog/search`

Request: query

- `q`
- `issuerId`

Response: `CardProductsResponse`

### `POST /api/v1/card-catalog/requests`

Request: `CreateCardProductRequest`

- `issuerName`
- `cardName`
- `createUserCard`
- `nickname`
- `lastFour`
- `isPrimary`

Response: `CardProductRequestResponse`

- `request`
- `userCard`

Behavior: server normalizes `issuerName` and `cardName` for duplicate checks before writing. User input creates a pending catalog request; it does not directly create trusted catalog rows.

### `GET /api/v1/card-catalog/products/{cardProductId}`

Response: `CardProductResponse`

- `product`
- `rewardRules`
- `terms`

### `GET /api/v1/card-catalog/categories`

Response: `CategoriesResponse`

- `categories`

### `GET /api/v1/card-catalog/category-aliases`

Response: `CategoryAliasesResponse`

- `aliases`

### `GET /api/v1/card-catalog/reward-rules`

Response: `RewardRulesResponse`

- `rewardRules`

## Admin Card Catalog

### `GET /api/v1/admin/card-catalog/requests`

Request: query

- `status`

Response: `CardProductRequestsResponse`

- `requests`

### `GET /api/v1/admin/card-catalog/requests/{requestId}`

Response: `CardProductRequestResponse`

- `request`
- `userCard`

### `POST /api/v1/admin/card-catalog/requests/{requestId}/approve`

Request: `ApproveCardProductRequest`

- `issuerName`
- `cardName`
- `networkCode`
- `rewardCurrencyCode`
- `notes`

Response: `CardProductRequestResponse`

Behavior: creates missing `catalog.card_issuers` / `catalog.card_products`, updates the request as approved, and invalidates catalog caches so the bank/card appears in dropdowns/search.

### `POST /api/v1/admin/card-catalog/requests/{requestId}/merge`

Request: `MergeCardProductRequest`

- `cardProductId`
- `notes`

Response: `CardProductRequestResponse`

Behavior: links the request to an existing `catalog.card_products` row, updates the request as merged, and invalidates affected request/card caches.

### `POST /api/v1/admin/card-catalog/requests/{requestId}/reject`

Request: `RejectCardProductRequest`

- `reason`

Response: `CardProductRequestResponse`

Behavior: marks the request rejected. No catalog issuer or product is created.

## Merchants

### `POST /api/v1/merchants/resolve`

Request: `ResolveMerchantRequest`

- `name`
- `provider`
- `providerPlaceId`
- `lat`
- `lng`
- `address`

Response: `MerchantResponse`

- `merchant`

### `GET /api/v1/merchants/{merchantId}`

Response: `MerchantResponse`

### `GET /api/v1/merchants/visits`

Response: `MerchantVisitsResponse`

- `visits`

### `POST /api/v1/merchants/visits`

Request: `CreateMerchantVisitRequest`

- `merchantId`
- `selectedCategoryCode`
- `visitedAt`

Response: `MerchantVisitsResponse`

Behavior: writes `finance.merchant_visits` and a `finance.merchant_visit.created` row in `messaging.event_outbox` in the same transaction. Outbox consumers handle recommendation preference refresh and cache invalidation.

## Recommendations

### `GET /api/v1/recommendations/home`

Response: `RecommendationResponse`

- `recommendation`
- `emptyState`

### `POST /api/v1/recommendations/in-store`

Request: `InStoreRecommendationRequest`

- `merchantId`
- `categoryCode`
- `estimatedAmount`

Response: `RecommendationResponse`

### `POST /api/v1/recommendations/refresh`

Request: `RefreshRecommendationRequest`

- `merchantId`
- `categoryCode`

Response: `RecommendationResponse`

### `POST /api/v1/recommendations/category`

Request: `UpdateRecommendationCategoryRequest`

- `recommendationId`
- `categoryCode`

Response: `RecommendationResponse`

## Transactions

### `GET /api/v1/transactions`

Request: query

- `q`
- `categoryCode`
- `cardId`

Response: `TransactionsResponse`

- `transactions`
- `emptyState`

### `GET /api/v1/transactions/{transactionId}`

Response: `TransactionDetailResponse`

- `transaction`
- `rewardResult`
- `missedReward`

### `POST /api/v1/transactions`

Request: `CreateTransactionRequest`

- `merchantName`
- `amount`
- `cardId`
- `categoryCode`
- `transactionDate`
- `transactionTime`
- `locationLabel`
- `locationLat`
- `locationLng`

Response: `TransactionDetailResponse`

Behavior: creates a manual transaction and computed reward/missed-reward rows, then writes `finance.transaction.created` to `messaging.event_outbox` in the same transaction.

### `POST /api/v1/transactions/{transactionId}`

Request: `UpdateTransactionRequest`

- `merchantName`
- `amount`
- `cardId`
- `categoryCode`
- `transactionDate`
- `transactionTime`
- `locationLabel`
- `locationLat`
- `locationLng`

Response: `TransactionDetailResponse`

Behavior: updates the transaction and recomputed reward/missed-reward rows, then writes `finance.transaction.updated` to `messaging.event_outbox` in the same transaction.

### `POST /api/v1/transactions/{transactionId}/delete`

Request: empty

Response: `TransactionsResponse`

Behavior: deletes or deactivates the transaction and writes `finance.transaction.deleted` to `messaging.event_outbox` in the same transaction.

### `GET /api/v1/transactions/search`

Request: query

- `q`
- `categoryCode`
- `cardId`

Response: `TransactionsResponse`

### `GET /api/v1/transactions/{transactionId}/reward-result`

Response: `TransactionRewardResultResponse`

- `earnedReward`
- `missedReward`

### `GET /api/v1/missed-rewards`

Response: `MissedRewardEventsResponse`

- `missedRewards`

### `POST /api/v1/missed-rewards/{missedRewardId}/not-a-miss`

Request: empty

Response: `TransactionDetailResponse`

Behavior: updates the missed-reward event and writes `finance.missed_reward.not_a_miss` to `messaging.event_outbox` in the same transaction.

## Analytics

### `GET /api/v1/analytics/rewards-summary`

Request: query

- `periodCode`

Response: `RewardsSummaryResponse`

- `earned` (`MoneyVm`)
- `missed` (`MoneyVm`)
- `earnedDelta` (`MoneyVm`) — vs prior comparable period
- `missedDelta` (`MoneyVm`) — vs prior comparable period
- `dailyBreakdown` (`RewardBreakdownItemVm[]`)
- `categoryBreakdown` (`RewardBreakdownItemVm[]`)
- `topMissedRewards` (`MissedRewardVm[]`)

### `GET /api/v1/analytics/missed-rewards-summary`

Request: query

- `periodCode`

Response: `MissedRewardsSummaryResponse`

- `missed` (`MoneyVm`)
- `missedDelta` (`MoneyVm`)
- `topMissedRewards` (`MissedRewardVm[]`)

## AI Insights

### `GET /api/v1/ai-insights`

Response: `AIInsightsResponse`

- `insights`

### `POST /api/v1/ai-insights/generate`

Request: empty

Response: `AIInsightGenerationResponse`

- `runId`
- `status`

### `GET /api/v1/ai-insights/generation/{runId}`

Response: `AIInsightGenerationResponse`

### `POST /api/v1/ai-insights/{insightId}/dismiss`

Request: empty

Response: `AIInsightsResponse`

## Notifications

### `GET /api/v1/notifications`

Request: query

- `filter` — one of `all`, `unread`, `rewards`, `security`. Defaults to `all`.

Response: `NotificationsResponse`

- `notifications`

### `GET /api/v1/notifications/{notificationId}`

Response: `NotificationDetailResponse`

- `notification`
- `relatedTransaction`
- `relatedMissedReward`

### `POST /api/v1/notifications/{notificationId}/read`

Request: empty

Response: `NotificationsResponse`

### `POST /api/v1/notifications/read-all`

Request: empty

Response: `NotificationsResponse`

## Notification Settings

### `GET /api/v1/notification-settings`

Response: `NotificationSettingsResponse`

- `masterEnabled`
- `pushEnabled`
- `emailEnabled`
- `quietHoursEnabled`
- `quietHoursStart`
- `quietHoursEnd`
- `types`

### `POST /api/v1/notification-settings`

Request: `UpdateNotificationSettingsRequest`

- `masterEnabled`
- `pushEnabled`
- `emailEnabled`
- `quietHoursEnabled`
- `quietHoursStart`
- `quietHoursEnd`

Response: `NotificationSettingsResponse`

### `GET /api/v1/notification-settings/types`

Response: `NotificationTypesResponse`

- `types`

### `POST /api/v1/notification-settings/types`

Saves one type preference per request; the mobile settings screen calls this once per toggle change.

Request: `UpdateNotificationTypePreferenceRequest`

- `typeCode`
- `enabled`

Response: `NotificationSettingsResponse`

## Notification Reminders

### `GET /api/v1/notification-reminders`

Response: `NotificationRemindersResponse`

- `reminders`

### `POST /api/v1/notification-reminders`

Request: `CreateNotificationReminderRequest`

- `sourceNotificationId`
- `remindAt`
- `title`
- `body`

Response: `NotificationRemindersResponse`

### `POST /api/v1/notification-reminders/{reminderId}/delete`

Request: empty

Response: `NotificationRemindersResponse`

## Devices

### `POST /api/v1/devices`

Request: `RegisterDeviceRequest`

- `platformCode`
- `pushToken` (nullable)
- `deviceName`
- `appVersion`
- `osVersion`
- `locale`
- `timezone`

Response: `DeviceResponse`

- `deviceId`
- `registered`

### `POST /api/v1/devices/{deviceId}`

Request: `UpdateDeviceRequest`

- `deviceName`
- `appVersion`
- `osVersion`

Response: `DeviceResponse`

### `POST /api/v1/devices/delete`

Request: `DeleteDeviceRequest`

- `pushToken`

Response: `DeviceResponse`

## Billing

### `GET /api/v1/billing/countries`

Response: `CountriesResponse`

- `countries`

### `GET /api/v1/billing/plans`

Response: `PlansResponse`

- `plans` (`PlanVm[]`)

### `GET /api/v1/billing/prices`

Request: query

- `countryCode`
- `periodCode`

Response: `PlanPricesResponse`

- `plans` (`PlanPriceVm[]`) — one row per plan for the requested country/period

### `GET /api/v1/billing/features`

Response: `PlanFeaturesResponse`

- `features` (`PlanFeatureVm[]`) — feature catalog with `valuesByPlan` embedded

### `GET /api/v1/billing/subscription`

Response: `SubscriptionResponse`

- `planCode`
- `status`
- `trialEnd`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`

### `GET /api/v1/billing/payment-methods`

Response: `PaymentMethodsResponse`

- `paymentMethods`

### `POST /api/v1/billing/checkout`

Request: `CreateCheckoutSessionRequest`

- `planCode`
- `periodCode`
- `returnContextCode` — `'billing' | 'onboarding'`. Server resolves the matching deep-link `success_url`/`cancel_url` for Stripe Checkout: `'billing'` returns to screen 8.3, `'onboarding'` returns to Home (2.5 is the last onboarding step).

Response: `HostedBillingResponse`

- `url`

### `POST /api/v1/billing/portal`

Request: empty

Response: `HostedBillingResponse`

## Entitlements

### `GET /api/v1/entitlements`

Response: `EntitlementsResponse`

- `planCode`
- `cardLinkLimit`
- `aiInsightsEnabled`
- `unlimitedCards`

## Privacy

### `GET /api/v1/privacy-settings`

Response: `PrivacySettingsResponse`

- `anonymousAnalyticsEnabled`
- `personalizedAIInsightsEnabled`
- `locationHistoryEnabled`
- `dataSharingForImprovementEnabled`

### `POST /api/v1/privacy-settings`

Request: `UpdatePrivacySettingsRequest`

- `anonymousAnalyticsEnabled`
- `personalizedAIInsightsEnabled`
- `locationHistoryEnabled`
- `dataSharingForImprovementEnabled`

Response: `PrivacySettingsResponse`

### `POST /api/v1/data-export`

Request: `RequestDataExportRequest`

- `format`

Response: `DataExportStatusResponse`

- `requestId`
- `status`
- `exportUrl`
- `expiresAt`

### `GET /api/v1/data-export/{requestId}`

Response: `DataExportStatusResponse`

### `GET /api/v1/location-history/download`

Response: `LocationHistoryResponse`

- `downloadUrl`

### `POST /api/v1/location-history/clear`

Request: `ClearLocationHistoryRequest`

- `deleteBefore`

Response: `LocationHistoryClearStatusResponse`

- `requestId`
- `status`
- `deletedEventCount`

### `GET /api/v1/location-history/clear/{requestId}`

Response: `LocationHistoryClearStatusResponse`

### `POST /api/v1/account-deletion`

Request: empty

Response: `AccountDeletionStatusResponse`

- `status`
- `requestedAt`
- `purgeAfter`

### `GET /api/v1/account-deletion`

Response: `AccountDeletionStatusResponse`

### `POST /api/v1/account-deletion/cancel`

Request: empty

Response: `AccountDeletionStatusResponse`

## Sync

### `GET /api/v1/sync/status`

Response: `SyncStatusResponse`

- `online`
- `lastSyncAt`
- `pendingCount`
- `cachedCounts` (`SyncCachedEntityCountVm[]`) — replaces the prior scalar `cachedItemCount`; one row per entity type
- `recentEvents` (`SyncEventVm[]`)

### `GET /api/v1/sync/pull`

Request: query

- `cursor`

Response: `SyncPullResponse`

- `cursor`
- `cards`
- `transactions`
- `notifications`
- `notificationReminders`

### `POST /api/v1/sync/push`

Request: `SyncPushRequest`

- `changes`

Response: `SyncPushResponse`

- `accepted`
- `conflicts`
- `cursor`

### `GET /api/v1/sync/conflicts`

Response: `SyncConflictsResponse`

- `conflicts`

### `POST /api/v1/sync/conflicts/{conflictId}/resolve`

Request: `ResolveConflictRequest`

- `resolutionCode`
- `mergedPayload`

Response: `SyncConflictsResponse`

### `POST /api/v1/sync/retry`

Request: empty

Response: `SyncStatusResponse`

## Webhooks

Inbound webhook endpoints. Each handler verifies the provider signature, deduplicates against its provider-specific event log, updates local DB, and publishes a domain event to `messaging.event_outbox` for in-app fan-out. See `_docs/Workflows/webhook-handlers.md`.

### `POST /api/v1/webhooks/stripe`

Auth: Stripe signature verification (`Stripe-Signature` header). Reject `400` on mismatch.

Request: raw Stripe event payload (jsonb).

Response: `WebhookAckResponse`

- `received` (boolean)
- `deduplicated` (boolean, optional) — true when `stripe_event_id` already exists in `billing.stripe_webhook_events`

### `POST /api/v1/webhooks/plaid`

Auth: Plaid signature verification (`Plaid-Verification` JWT). Reject `400` on mismatch.

Request: raw Plaid webhook payload (jsonb).

Response: `WebhookAckResponse`

### `POST /api/v1/webhooks/foursquare`

Auth: Foursquare webhook signature verification (`Foursquare-Signature` header). Reject `400` on mismatch.

Handles `user.entered_geofence` and `user.entered_place` events. Inserts `finance.foursquare_webhook_events` for dedup, resolves the merchant, generates an in-store recommendation, creates a `messaging.notifications` row (`type = best_card_alert`), and publishes `messaging.notification.created` so the existing `PushFanOutConsumer` delivers the push.

Request: raw Foursquare event payload (jsonb).

Response: `WebhookAckResponse`

## Push Payloads

These are the JSON data payloads delivered to the device via APNs / FCM — **not REST endpoints**. The mobile app parses one of these on notification tap to deep-link the user to the right screen. The discriminator `type` matches `messaging.notification_types.code` exactly. Producers in [notification-production.md](../../Workflows/notification-production.md) construct one of these per `messaging.notifications` row.

### `BasePushPayloadVm`

Common fields embedded in every push payload below. Defined once so per-type schemas only declare their type-specific routing fields.

- `type` — from `messaging.notification_types.code`; discriminator for the union
- `notificationId` — `messaging.notifications.id`; opens inbox detail (7.2) as the default deep link

### `MissedRewardsPushPayload`

Routes to transaction detail (6.2) showing the missed reward. Producer: `MissedRewardNotificationProducer`.

- `BasePushPayloadVm` (`type = 'missed_rewards'`)
- `transactionId` — `finance.transactions.id`
- `missedRewardEventId` — `finance.missed_reward_events.id`

### `BestCardAlertPushPayload`

Routes to the in-app recommendation surface for the detected merchant. Producer: `BestCardAlertProducer` — fired inline from `POST /api/v1/webhooks/foursquare` in Phase 1 ([10-geo-recommendations.md](../../Workflows/10-geo-recommendations.md)).

- `BasePushPayloadVm` (`type = 'best_card_alert'`)
- `recommendationId` — `finance.recommendations.id`
- `merchantId` — `finance.merchants.id`

### `WeeklySummaryPushPayload`

Routes to the Insights tab (6.3). Producer: `WeeklySummaryProducer`.

- `BasePushPayloadVm` (`type = 'weekly_summary'`)

### `UnusualTransactionPushPayload`

Routes to transaction detail (6.2). Producer: `UnusualTransactionProducer`.

- `BasePushPayloadVm` (`type = 'unusual_transaction'`)
- `transactionId` — `finance.transactions.id`

### `SystemPushPayload`

System / operational pushes. Phase 1 uses this for Plaid re-auth nudges; future system pushes (admin announcements, security alerts) extend the same shape via `subtype`. Producer for Plaid re-auth: `PlaidReauthNotificationProducer` ([webhook-handlers.md](../../Workflows/webhook-handlers.md)).

- `BasePushPayloadVm` (`type = 'system'`)
- `subtype` — e.g. `'plaid_reauth'`; defaults the routing destination
- `plaidItemId` — present when `subtype = 'plaid_reauth'`; routes to Plaid connections (5.4)

## Lookups

All lookup endpoints return `LookupsResponse`.

Response: `LookupsResponse`

- `items`

### `GET /api/v1/lookups/onboarding-steps`
### `GET /api/v1/lookups/permission-states`
### `GET /api/v1/lookups/card-networks`
### `GET /api/v1/lookups/reward-currencies`
### `GET /api/v1/lookups/cap-periods`
### `GET /api/v1/lookups/plaid-item-statuses`
### `GET /api/v1/lookups/card-sources`
### `GET /api/v1/lookups/recommendation-contexts`
### `GET /api/v1/lookups/location-event-types`
### `GET /api/v1/lookups/currencies`
### `GET /api/v1/lookups/periods`
### `GET /api/v1/lookups/subscription-statuses`
### `GET /api/v1/lookups/payment-method-types`
### `GET /api/v1/lookups/device-platforms`
### `GET /api/v1/lookups/notification-channels`
### `GET /api/v1/lookups/delivery-statuses`
### `GET /api/v1/lookups/analytics-periods`
### `GET /api/v1/lookups/generation-statuses`
### `GET /api/v1/lookups/ai-insight-types`
### `GET /api/v1/lookups/priority-levels`
### `GET /api/v1/lookups/entity-types`
### `GET /api/v1/lookups/operations`
### `GET /api/v1/lookups/outbox-statuses`
### `GET /api/v1/lookups/conflict-resolutions`
### `GET /api/v1/lookups/event-types`
### `GET /api/v1/lookups/roles`
