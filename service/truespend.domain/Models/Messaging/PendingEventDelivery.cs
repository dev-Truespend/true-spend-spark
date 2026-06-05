namespace TrueSpend.Domain.Models.Messaging;

public sealed record PendingEventDelivery(
    int DeliveryId,
    int OutboxEventId,
    int SubscriptionId,
    string EventType,
    string ConsumerName,
    string Payload,
    short AttemptCount,
    short MaxRetries,
    int RetryBackoffSeconds);
