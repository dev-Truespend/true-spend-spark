namespace TrueSpend.Domain.Entities.Messaging;

public sealed class EventOutboxEntity
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string AggregateType { get; set; } = string.Empty;
    public int? AggregateId { get; set; }
    public string Payload { get; set; } = "{}";
    public string? IdempotencyKey { get; set; }
    public short StatusId { get; set; }
    public DateTimeOffset AvailableAt { get; set; }
    public DateTimeOffset? DispatchedAt { get; set; }
    public DateTimeOffset? SucceededAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
