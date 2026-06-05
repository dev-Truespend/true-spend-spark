namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationPreferenceEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public bool MasterEnabled { get; set; } = true;
    public bool PushEnabled { get; set; } = true;
    public bool EmailEnabled { get; set; } = true;
    public bool QuietHoursEnabled { get; set; }
    public TimeOnly? QuietHoursStart { get; set; }
    public TimeOnly? QuietHoursEnd { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
