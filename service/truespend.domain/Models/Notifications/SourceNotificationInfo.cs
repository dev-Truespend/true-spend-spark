namespace TrueSpend.Domain.Models.Notifications;

// Snapshot of a source notification used by ReminderFiringJob to inherit the source's
// payload type (so the reminder push can deep-link back into the same detail flow).
public sealed record SourceNotificationInfo(
    int SourceNotificationId,
    short NotificationTypeId,
    string NotificationTypeCode,
    string? Payload);
