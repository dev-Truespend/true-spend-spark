namespace TrueSpend.Domain.Events.Notifications;

public sealed record NotificationReadEventContract(int Version, int NotificationId, Guid UserId);
