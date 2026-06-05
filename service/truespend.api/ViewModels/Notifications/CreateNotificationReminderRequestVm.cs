namespace TrueSpend.Api.ViewModels.Notifications;

public sealed record CreateNotificationReminderRequestVm(
    int? SourceNotificationId,
    DateTimeOffset RemindAt,
    string Title,
    string Body);
