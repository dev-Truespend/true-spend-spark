namespace TrueSpend.Domain.Entities.Finance;

public sealed class PlaidWebhookEventEntity
{
    public int Id { get; set; }
    public string PlaidEventId { get; set; } = string.Empty;
    public string WebhookType { get; set; } = string.Empty;
    public string WebhookCode { get; set; } = string.Empty;
    public int? PlaidItemId { get; set; }
    public Guid? UserId { get; set; }
    public string Payload { get; set; } = "{}";
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public string? ProcessingError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
