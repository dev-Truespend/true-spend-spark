namespace TrueSpend.Domain.Events.Notifications;

public sealed record NotificationCreatedEventContract(int Version, int NotificationId, Guid UserId);
