namespace TrueSpend.Domain.ServiceInterfaces.Messaging;

public interface IMessagingInsertService
{
    Task EnqueueOutboxEventAsync(
        string eventType,
        string aggregateType,
        int? aggregateId,
        string payloadJson,
        string? idempotencyKey,
        CancellationToken cancellationToken);
}
