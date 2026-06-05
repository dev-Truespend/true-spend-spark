namespace TrueSpend.Domain.Entities.Billing;

public sealed class StripeWebhookEventEntity
{
    public long Id { get; set; }
    public string StripeEventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = "{}";
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public string? ProcessingError { get; set; }
}
