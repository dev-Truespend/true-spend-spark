namespace TrueSpend.Domain.Events.Notifications;

public sealed record NotificationPreferencesUpdatedEvent(int Version, Guid UserId);
