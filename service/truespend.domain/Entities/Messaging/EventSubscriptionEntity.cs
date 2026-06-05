namespace TrueSpend.Domain.Entities.Messaging;

public sealed class EventSubscriptionEntity
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string ConsumerName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public short MaxRetries { get; set; } = 5;
    public int RetryBackoffSeconds { get; set; } = 30;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
