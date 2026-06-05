namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short NotificationTypeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int? RelatedTransactionId { get; set; }
    public int? RelatedMissedRewardEventId { get; set; }
    public string? Payload { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public NotificationTypeEntity? NotificationType { get; set; }
}
