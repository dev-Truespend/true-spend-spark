namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationReminderEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int? SourceNotificationId { get; set; }
    public DateTimeOffset RemindAt { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsFired { get; set; }
    public DateTimeOffset? FiredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
