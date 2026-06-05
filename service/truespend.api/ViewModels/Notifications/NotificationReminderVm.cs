namespace TrueSpend.Api.ViewModels.Notifications;

public sealed record NotificationReminderVm(
    int Id,
    int? SourceNotificationId,
    DateTimeOffset RemindAt,
    string Title,
    string Body,
    bool IsFired,
    DateTimeOffset CreatedAt);
