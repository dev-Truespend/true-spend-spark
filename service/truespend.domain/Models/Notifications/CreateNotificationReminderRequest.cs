namespace TrueSpend.Domain.Models.Notifications;

public sealed record CreateNotificationReminderRequest(
    int? SourceNotificationId,
    DateTimeOffset RemindAt,
    string Title,
    string Body);
