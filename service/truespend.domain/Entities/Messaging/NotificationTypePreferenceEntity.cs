namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationTypePreferenceEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short NotificationTypeId { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
