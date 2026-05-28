# Phase 1 API Contracts

Only mobile Phase 1 screen contracts are listed. All writes use `POST`.

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

### `RewardRuleVm`

- `categoryCode`
- `categoryName`
- `multiplier`
- `capDisplay`
- `notes`

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
- `expectedRewardRate`
- `expectedReward`
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

### `SyncConflictVm`

- `id`
- `entityType`
- `entityId`
- `localPayload`
- `remotePayload`
- `detectedAt`

## Profile

### `GET /api/v1/profile`

Response: `ProfileResponse`

- `displayName`
- `email`
- `phone`
- `avatarUrl`
- `countryCode`
- `currentPlanCode`

### `POST /api/v1/profile`

Request: `UpdateProfileRequest`

- `displayName`
- `phone`
- `countryCode`

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
- `lastReportedAt`

### `POST /api/v1/permissions`

Request: `UpdatePermissionsRequest`

- `location`
- `camera`
- `notifications`

Response: `PermissionsResponse`

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

### `GET /api/v1/plaid/connections`

Response: `PlaidConnectionsResponse`

- `connections`

### `POST /api/v1/plaid/connections/sync`

Request: `SyncPlaidConnectionRequest`

- `connectionId`

Response: `PlaidConnectionResponse`

### `POST /api/v1/plaid/connections/reconnect`

Request: `ReconnectPlaidConnectionRequest`

- `connectionId`

Response: `PlaidLinkTokenResponse`

### `POST /api/v1/plaid/connections/disconnect`

Request: `DisconnectPlaidConnectionRequest`

- `connectionId`

Response: `PlaidConnectionResponse`

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

### `POST /api/v1/cards/{cardId}`

Request: `UpdateCardRequest`

- `nickname`
- `lastFour`
- `isPrimary`

Response: `CardDetailResponse`

### `POST /api/v1/cards/{cardId}/delete`

Request: empty

Response: `CardsResponse`

### `POST /api/v1/cards/{cardId}/primary`

Request: empty

Response: `CardsResponse`

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

### `POST /api/v1/cards/{cardId}/reward-overrides/delete`

Request: `DeleteRewardOverrideRequest`

- `categoryCode`

Response: `RewardOverridesResponse`

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

Request: `CreateManualTransactionRequest`

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

### `POST /api/v1/transactions/{transactionId}`

Request: `UpdateTransactionRequest`

- `cardId`
- `categoryCode`

Response: `TransactionDetailResponse`

### `POST /api/v1/transactions/{transactionId}/delete`

Request: empty

Response: `TransactionsResponse`

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

## Analytics

### `GET /api/v1/analytics/rewards-summary`

Request: query

- `periodCode`

Response: `RewardsSummaryResponse`

- `earned`
- `missed`
- `earnedDelta`
- `missedDelta`
- `dailyBreakdown`
- `categoryBreakdown`
- `topMissedRewards`

### `GET /api/v1/analytics/missed-rewards-summary`

Request: query

- `periodCode`

Response: `MissedRewardsSummaryResponse`

- `missed`
- `missedDelta`
- `topMissedRewards`

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

- `filter`

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
- `pushToken`
- `deviceName`
- `appVersion`
- `osVersion`

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

- `plans`

### `GET /api/v1/billing/prices`

Request: query

- `countryCode`
- `periodCode`

Response: `PlanPricesResponse`

- `plans`

### `GET /api/v1/billing/features`

Response: `PlanFeaturesResponse`

- `features`

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
- `cachedItemCount`
- `recentEvents`

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
