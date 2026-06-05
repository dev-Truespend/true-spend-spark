namespace TrueSpend.Domain.Entities.Privacy;

public sealed class PrivacyAuditEventEntity
{
    public long Id { get; set; }
    public Guid? UserId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
