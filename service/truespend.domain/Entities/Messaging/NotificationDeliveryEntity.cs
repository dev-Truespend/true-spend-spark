namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationDeliveryEntity
{
    public int Id { get; set; }
    public int NotificationId { get; set; }
    public int? DeviceId { get; set; }
    public short ChannelId { get; set; }
    public short StatusId { get; set; }
    public string? ExternalId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset AttemptedAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; }
    public short AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
