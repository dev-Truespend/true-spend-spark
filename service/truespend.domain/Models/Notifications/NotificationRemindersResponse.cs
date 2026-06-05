namespace TrueSpend.Domain.Models.Notifications;

public sealed record NotificationRemindersResponse(IReadOnlyList<NotificationReminder> Reminders);
