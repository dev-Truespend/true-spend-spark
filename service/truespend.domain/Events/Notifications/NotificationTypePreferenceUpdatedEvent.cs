namespace TrueSpend.Domain.Events.Notifications;

public sealed record NotificationTypePreferenceUpdatedEvent(int Version, string TypeCode, bool Enabled, Guid UserId);
