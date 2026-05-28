# Phase 1 API Design

## Controllers

### `ProfileController` - 2 APIs

- `GetProfile`
- `UpdateProfile`

### `PreferencesController` - 2 APIs

- `GetPreferences`
- `UpdatePreferences`

### `PermissionsController` - 2 APIs

- `GetPermissions`
- `UpdatePermissions`

### `OnboardingController` - 4 APIs

- `GetOnboardingState`
- `UpdateOnboardingState`
- `CompleteOnboarding`
- `SkipCardLinking`

### `PlaidController` - 6 APIs

- `CreateLinkToken`
- `ExchangePublicToken`
- `ListConnections`
- `SyncConnection`
- `ReconnectConnection`
- `DisconnectConnection`

### `CardsController` - 10 APIs

- `ListCards`
- `GetCard`
- `CreateManualCard`
- `UpdateCard`
- `DeleteCard`
- `SetPrimaryCard`
- `GetCardLimits`
- `ListCardRewardOverrides`
- `UpsertCardRewardOverride`
- `DeleteCardRewardOverride`

### `CardCatalogController` - 7 APIs

- `ListIssuers`
- `ListCardProducts`
- `SearchCardCatalog`
- `GetCardProduct`
- `ListCategories`
- `ListCategoryAliases`
- `ListRewardRules`

### `MerchantsController` - 4 APIs

- `ResolveMerchant`
- `GetMerchant`
- `ListMerchantVisits`
- `CreateMerchantVisit`

### `RecommendationsController` - 4 APIs

- `GetHomeRecommendation`
- `GetInStoreRecommendation`
- `RefreshRecommendation`
- `UpdateRecommendationCategory`

### `TransactionsController` - 9 APIs

- `ListTransactions`
- `GetTransaction`
- `CreateManualTransaction`
- `UpdateTransaction`
- `DeleteTransaction`
- `SearchTransactions`
- `GetTransactionRewardResult`
- `ListMissedRewardEvents`
- `MarkMissedRewardNotAMiss`

### `AnalyticsController` - 2 APIs

- `GetRewardsSummary`
- `GetMissedRewardsSummary`

### `AIInsightsController` - 4 APIs

- `ListAIInsights`
- `RequestAIInsightGeneration`
- `GetAIInsightGenerationStatus`
- `DismissAIInsight`

### `NotificationsController` - 4 APIs

- `ListNotifications`
- `GetNotification`
- `MarkNotificationRead`
- `MarkAllNotificationsRead`

### `NotificationSettingsController` - 4 APIs

- `GetNotificationSettings`
- `UpdateNotificationSettings`
- `ListNotificationTypes`
- `UpdateNotificationTypePreference`

### `NotificationRemindersController` - 3 APIs

- `ListNotificationReminders`
- `CreateNotificationReminder`
- `DeleteNotificationReminder`

### `DevicesController` - 3 APIs

- `RegisterDevice`
- `UpdateDevice`
- `DeleteDevice`

### `BillingController` - 8 APIs

- `ListCountries`
- `ListPlans`
- `ListPlanPrices`
- `ListPlanFeatures`
- `GetSubscription`
- `ListPaymentMethods`
- `CreateCheckoutSession`
- `CreatePortalSession`

### `EntitlementsController` - 1 API

- `GetEntitlements`

### `StripeWebhookController` - 1 API

- `HandleStripeWebhook`

### `PrivacySettingsController` - 2 APIs

- `GetPrivacySettings`
- `UpdatePrivacySettings`

### `DataExportController` - 2 APIs

- `RequestDataExport`
- `GetDataExportStatus`

### `LocationHistoryController` - 3 APIs

- `DownloadLocationHistory`
- `RequestLocationHistoryClear`
- `GetLocationHistoryClearStatus`

### `AccountDeletionController` - 3 APIs

- `RequestAccountDeletion`
- `GetAccountDeletionStatus`
- `CancelAccountDeletion`

### `SyncController` - 6 APIs

- `GetSyncStatus`
- `PullChanges`
- `PushChanges`
- `ListConflicts`
- `ResolveConflict`
- `RetrySync`

### `LookupsController` - 26 APIs

- `ListOnboardingSteps`
- `ListPermissionStates`
- `ListCardNetworks`
- `ListRewardCurrencies`
- `ListCapPeriods`
- `ListPlaidItemStatuses`
- `ListCardSources`
- `ListRecommendationContexts`
- `ListLocationEventTypes`
- `ListCurrencies`
- `ListPeriods`
- `ListSubscriptionStatuses`
- `ListPaymentMethodTypes`
- `ListDevicePlatforms`
- `ListNotificationChannels`
- `ListDeliveryStatuses`
- `ListAnalyticsPeriods`
- `ListGenerationStatuses`
- `ListAIInsightTypes`
- `ListPriorityLevels`
- `ListEntityTypes`
- `ListOperations`
- `ListOutboxStatuses`
- `ListConflictResolutions`
- `ListEventTypes`
- `ListRoles`

### `UserRolesController` - 3 APIs

- `ListUserRoles`
- `AssignUserRole`
- `RevokeUserRole`

### `FeatureFlagsController` - 5 APIs

- `ListFeatureFlags`
- `GetFeatureFlag`
- `CreateFeatureFlag`
- `UpdateFeatureFlag`
- `DeleteFeatureFlag`

### `UserFeatureFlagsController` - 4 APIs

- `ListMyFeatureFlags`
- `ListUserFeatureFlags`
- `AssignUserFeatureFlag`
- `RevokeUserFeatureFlag`

## Total

- Controllers: 28
- APIs: 134

## Background Jobs

- `CatalogSyncJob`
- `PlaidMetadataSyncJob`
- `StripeEntitlementSyncJob`
- `RewardComputationJob`
- `AnalyticsSnapshotJob`
- `AIInsightGenerationJob`
- `NotificationDispatchJob`
- `NotificationReminderJob`
- `WeeklySummaryJob`
- `DataExportJob`
- `LocationHistoryDeletionJob`
- `AccountDeletionPurgeJob`
- `SyncRetryJob`
- `InvalidDeviceTokenCleanupJob`

## Messaging Contracts

- `catalog.sync.completed`
- `plaid.metadata.sync.requested`
- `plaid.metadata.sync.completed`
- `card.created`
- `card.updated`
- `card.deleted`
- `card.reward_override.changed`
- `merchant.resolved`
- `merchant_visit.created`
- `recommendation.generated`
- `transaction.created`
- `transaction.updated`
- `transaction.deleted`
- `reward.compute.requested`
- `reward.computed`
- `reward.missed.detected`
- `analytics.snapshot.requested`
- `analytics.snapshot.completed`
- `insight.generate.requested`
- `insight.generated`
- `insight.dismissed`
- `notification.created`
- `notification.send.requested`
- `notification.sent`
- `notification.reminder.due`
- `subscription.changed`
- `payment_method.changed`
- `data_export.requested`
- `data_export.completed`
- `location_history.delete.requested`
- `location_history.delete.completed`
- `account_deletion.requested`
- `account_deletion.cancelled`
- `account_deletion.purge_due`
- `sync.conflict.detected`
- `device_token.invalidated`

## Total Messaging Contracts

- Contracts: 36
