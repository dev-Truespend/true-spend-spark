using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Models.Notifications;

// Builds the JSON `payload` column stored on messaging.notifications. Each variant matches one
// of the discriminated-union push payload contracts in _docs/low-level-design/Service/api-design-extended.md
// (§ Push Payloads). ExpoPushDeliveryService flattens these onto Expo's `data` map so the mobile
// router (usePushNotificationRouting) can read top-level keys.
public static class PushPayloadBuilder
{
    public static string MissedRewards(int notificationId, int transactionId, int missedRewardEventId) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.MissedRewardsTypeCode,
            notificationId,
            transactionId,
            missedRewardEventId
        });

    public static string BestCardAlert(int notificationId, int recommendationId, int merchantId) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.BestCardAlertTypeCode,
            notificationId,
            recommendationId,
            merchantId
        });

    // Grouped/area arrival: one push, several nearby stores each with their best card. Carries the item
    // list for rich rendering; `notificationId` still drives tap-through to the inbox detail like a single
    // alert, so no new deep-link route is required on the client.
    public static string GroupedBestCardAlert(int notificationId, IReadOnlyList<(int MerchantId, int RecommendationId)> items) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.GroupedBestCardAlertPayloadType,
            notificationId,
            items = items.Select(i => new { merchantId = i.MerchantId, recommendationId = i.RecommendationId }).ToArray()
        });

    public static string WeeklySummary(int notificationId) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.WeeklySummaryTypeCode,
            notificationId
        });

    public static string UnusualTransaction(int notificationId, int transactionId) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.UnusualTransactionTypeCode,
            notificationId,
            transactionId
        });

    public static string SubscriptionExpiry(int notificationId, string kind, int daysBefore, DateTimeOffset expiresAt) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.SubscriptionExpiryTypeCode,
            notificationId,
            kind,
            daysBefore,
            expiresAt
        });

    public static string System(int notificationId, string? subtype = null, int? plaidItemId = null) =>
        JsonSerializer.Serialize(new
        {
            type = NotificationsConstants.SystemTypeCode,
            notificationId,
            subtype,
            plaidItemId
        });
}
