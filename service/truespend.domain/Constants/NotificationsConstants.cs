namespace TrueSpend.Domain.Constants;

public static class NotificationsConstants
{
    public const string BestCardAlertTypeCode = "best_card_alert";
    public const string MissedRewardsTypeCode = "missed_rewards";
    public const string WeeklySummaryTypeCode = "weekly_summary";
    public const string UnusualTransactionTypeCode = "unusual_transaction";
    public const string SystemTypeCode = "system";

    public const decimal UnusualTransactionThresholdAmount = 500m;
    public static readonly TimeSpan UnusualTransactionLookback = TimeSpan.FromMinutes(15);

    public const string FilterAll = "all";
    public const string FilterUnread = "unread";
    public const string FilterRewards = "rewards";
    public const string FilterSecurity = "security";

    public const string ChannelPush = "push";
    public const string ChannelEmail = "email";
    public const string ChannelInbox = "inbox";

    public const string DeliveryStatusPending = "pending";
    public const string DeliveryStatusSent = "sent";
    public const string DeliveryStatusDelivered = "delivered";
    public const string DeliveryStatusFailed = "failed";
    public const string DeliveryStatusSkipped = "skipped";
    public const string DeliveryStatusDeadLettered = "dead_lettered";

    public static readonly string[] InvalidPushTokenErrorCodes =
    {
        "Unregistered",
        "BadDeviceToken",
        "InvalidRegistration",
        "NotRegistered",
        "MismatchSenderId",
    };

    public static readonly TimeSpan InvalidDeviceTokenLookback = TimeSpan.FromHours(48);

    public const string PlatformIos = "ios";
    public const string PlatformAndroid = "android";

    public static readonly string[] InboxFilters = { FilterAll, FilterUnread, FilterRewards, FilterSecurity };

    public static string InboxCacheKey(Guid userId, string filter) =>
        $"notifications:inbox:{userId:N}:{filter}";
}
