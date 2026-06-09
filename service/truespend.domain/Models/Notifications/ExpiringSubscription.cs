namespace TrueSpend.Domain.Models.Notifications;

// A subscription whose trial or paid period is approaching its end, surfaced to the
// subscription-expiry reminder producer. Kind is NotificationsConstants.SubscriptionExpiry*Kind.
public sealed record ExpiringSubscription(
    Guid UserId,
    string Kind,
    DateTimeOffset ExpiresAt);
