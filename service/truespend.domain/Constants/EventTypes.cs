namespace TrueSpend.Domain.Constants;

public static class EventTypes
{
    public const string UserCardCreated = "finance.user_card.created";
    public const string UserCardUpdated = "finance.user_card.updated";
    public const string UserCardDeleted = "finance.user_card.deleted";
    public const string CardProductRequestCreated = "catalog.card_product_request.created";
    public const string RewardOverrideUpserted = "finance.reward_override.upserted";
    public const string RewardOverrideDeleted = "finance.reward_override.deleted";
    public const string PlaidConnectionSynced = "finance.plaid_connection.synced";
    public const string PlaidConnectionDisconnected = "finance.plaid_connection.disconnected";
    public const string PlaidItemStatusChanged = "finance.plaid_item.status_changed";
    public const string PlaidItemNewAccountsAvailable = "finance.plaid_item.new_accounts_available";
    public const string MissedRewardEventCreated = "finance.missed_reward_event.created";
    public const string MerchantVisitCreated = "finance.merchant_visit.created";
    public const string BillingSubscriptionUpdated = "billing.subscription.updated";
    public const string BillingPaymentMethodUpdated = "billing.payment_method.updated";
    public const string TransactionCreated = "finance.transaction.created";
    public const string TransactionUpdated = "finance.transaction.updated";
    public const string TransactionDeleted = "finance.transaction.deleted";
    public const string TransactionImported = "finance.transaction.imported";
    public const string MissedRewardNotAMiss = "finance.missed_reward.not_a_miss";
    public const string NotificationCreated = "messaging.notification.created";
    public const string NotificationRead = "messaging.notification.read";
    public const string NotificationsReadAll = "messaging.notifications.read_all";
    public const string NotificationPreferencesUpdated = "messaging.notification_preferences.updated";
    public const string NotificationTypePreferenceUpdated = "messaging.notification_type_preference.updated";
    public const string AIGenerationCompleted = "insights.ai_generation.completed";
    public const string AIInsightDismissed = "insights.ai_insight.dismissed";
    public const string AppProfileUpdated = "app.profile.updated";
}
