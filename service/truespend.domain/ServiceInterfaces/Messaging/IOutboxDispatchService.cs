using TrueSpend.Domain.Models.Messaging;

namespace TrueSpend.Domain.ServiceInterfaces.Messaging;

public interface IOutboxDispatchService
{
    Task<IReadOnlyList<PendingOutboxEvent>> GetQueuedEventsAsync(int batchSize, CancellationToken cancellationToken);

    Task<IReadOnlyList<OutboxSubscriptionRef>> GetActiveSubscriptionsAsync(string eventType, CancellationToken cancellationToken);

    Task FanOutEventAsync(int outboxEventId, IReadOnlyList<int> subscriptionIds, CancellationToken cancellationToken);

    Task MarkEventNoSubscribersAsync(int outboxEventId, CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingEventDelivery>> GetPendingDeliveriesAsync(int batchSize, CancellationToken cancellationToken);

    Task<bool> ClaimDeliveryAsync(int deliveryId, CancellationToken cancellationToken);

    Task MarkDeliverySucceededAsync(int deliveryId, CancellationToken cancellationToken);

    Task MarkDeliveryFailedAsync(int deliveryId, string error, DateTimeOffset? nextAttemptAt, bool deadLetter, CancellationToken cancellationToken);

    Task RollupEventAsync(int outboxEventId, CancellationToken cancellationToken);
}
