namespace TrueSpend.Domain.Constants;

public static class MessagingConstants
{
    public const string EventStatusQueued = "queued";
    public const string EventStatusDispatched = "dispatched";
    public const string EventStatusSucceeded = "succeeded";
    public const string EventStatusPartiallyFailed = "partially_failed";
    public const string EventStatusFailed = "failed";

    public const string DeliveryStatusPending = "pending";
    public const string DeliveryStatusProcessing = "processing";
    public const string DeliveryStatusSucceeded = "succeeded";
    public const string DeliveryStatusRetrying = "retrying";
    public const string DeliveryStatusDeadLettered = "dead_lettered";

    public const string EntitlementCacheInvalidatorConsumer = "EntitlementCacheInvalidator";
    public const string BillingPaymentMethodCacheInvalidatorConsumer = "BillingPaymentMethodCacheInvalidator";
    public const string UserCardCreatedConsumer = "UserCardCreatedConsumer";
    public const string CardProductRequestCreatedConsumer = "CardProductRequestCreatedConsumer";
    public const string MerchantVisitCreatedConsumer = "MerchantVisitCreatedConsumer";
    public const string RewardOverrideUpsertedConsumer = "RewardOverrideUpsertedConsumer";
    public const string RewardOverrideDeletedConsumer = "RewardOverrideDeletedConsumer";
    public const string PlaidConnectionDisconnectedConsumer = "PlaidConnectionDisconnectedConsumer";
    public const string PlaidReauthNotificationProducerConsumer = "PlaidReauthNotificationProducer";
    public const string PlaidNewAccountsNotificationProducerConsumer = "PlaidNewAccountsNotificationProducer";
    public const string CardsCacheInvalidatorConsumer = "CardsCacheInvalidator";
    public const string MissedRewardNotificationProducerConsumer = "MissedRewardNotificationProducer";
    public const string AnalyticsRecomputeConsumer = "AnalyticsRecomputeConsumer";
    public const string PushFanOutConsumer = "PushFanOutConsumer";
    public const string InboxCacheInvalidatorConsumer = "InboxCacheInvalidator";
    public const string NotificationReadConsumer = "NotificationReadConsumer";
    public const string NotificationsReadAllConsumer = "NotificationsReadAllConsumer";
    public const string AIInsightsCacheInvalidatorConsumer = "AIInsightsCacheInvalidator";
}
