using TrueSpend.Domain.Models.Messaging;

namespace TrueSpend.Domain.BusinessInterfaces.Messaging;

public interface IOutboxDispatchBusiness
{
    Task<int> FanOutQueuedEventsAsync(int batchSize, CancellationToken cancellationToken);

    Task<int> ProcessPendingDeliveriesAsync(
        int batchSize,
        Func<PendingEventDelivery, CancellationToken, Task> invokeHandler,
        CancellationToken cancellationToken);
}
