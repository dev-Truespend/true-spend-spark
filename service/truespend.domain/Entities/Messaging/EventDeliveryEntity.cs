namespace TrueSpend.Domain.Entities.Messaging;

public sealed class EventDeliveryEntity
{
    public int Id { get; set; }
    public int EventOutboxId { get; set; }
    public int EventSubscriptionId { get; set; }
    public short StatusId { get; set; }
    public short AttemptCount { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset? SucceededAt { get; set; }
    public DateTimeOffset? DeadLetteredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
