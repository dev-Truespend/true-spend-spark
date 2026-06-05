using TrueSpend.Domain.BusinessInterfaces.Messaging;
using TrueSpend.Domain.Models.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Messaging;

namespace TrueSpend.Domain.Business.Messaging;

public sealed class OutboxDispatchBusiness(IOutboxDispatchService service) : IOutboxDispatchBusiness
{
    public async Task<int> FanOutQueuedEventsAsync(int batchSize, CancellationToken cancellationToken)
    {
        var queued = await service.GetQueuedEventsAsync(batchSize, cancellationToken);
        var fannedOut = 0;
        foreach (var evt in queued)
        {
            if (cancellationToken.IsCancellationRequested) break;
            var subscriptions = await service.GetActiveSubscriptionsAsync(evt.EventType, cancellationToken);
            if (subscriptions.Count == 0)
            {
                await service.MarkEventNoSubscribersAsync(evt.Id, cancellationToken);
                continue;
            }
            await service.FanOutEventAsync(evt.Id, subscriptions.Select(s => s.SubscriptionId).ToList(), cancellationToken);
            fannedOut++;
        }
        return fannedOut;
    }

    public async Task<int> ProcessPendingDeliveriesAsync(
        int batchSize,
        Func<PendingEventDelivery, CancellationToken, Task> invokeHandler,
        CancellationToken cancellationToken)
    {
        var deliveries = await service.GetPendingDeliveriesAsync(batchSize, cancellationToken);
        var processed = 0;
        foreach (var delivery in deliveries)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var claimed = await service.ClaimDeliveryAsync(delivery.DeliveryId, cancellationToken);
            if (!claimed) continue;

            try
            {
                await invokeHandler(delivery, cancellationToken);
                await service.MarkDeliverySucceededAsync(delivery.DeliveryId, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                var nextAttempt = delivery.AttemptCount + 1;
                var deadLetter = nextAttempt >= delivery.MaxRetries;
                DateTimeOffset? nextAttemptAt = null;
                if (!deadLetter)
                {
                    var seconds = delivery.RetryBackoffSeconds * (int)Math.Pow(2, Math.Max(0, nextAttempt - 1));
                    nextAttemptAt = DateTimeOffset.UtcNow.AddSeconds(seconds);
                }
                await service.MarkDeliveryFailedAsync(delivery.DeliveryId, ex.Message, nextAttemptAt, deadLetter, cancellationToken);
            }

            await service.RollupEventAsync(delivery.OutboxEventId, cancellationToken);
            processed++;
        }
        return processed;
    }
}
