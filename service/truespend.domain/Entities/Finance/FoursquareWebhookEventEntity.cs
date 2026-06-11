namespace TrueSpend.Domain.Entities.Finance;

public sealed class FoursquareWebhookEventEntity
{
    public int Id { get; set; }
    public string Provider { get; set; } = "foursquare";
    public string FoursquareEventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string? FoursquareUserId { get; set; }
    public Guid? UserId { get; set; }
    public int? MerchantId { get; set; }
    public string Payload { get; set; } = "{}";
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public string? ProcessingError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
