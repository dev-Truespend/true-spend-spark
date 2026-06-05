namespace TrueSpend.Domain.Models.Notifications;

public sealed class NotificationReminder
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public int? SourceNotificationId { get; init; }
    public DateTimeOffset RemindAt { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public bool IsFired { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
