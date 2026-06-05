using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Messaging;

namespace TrueSpend.Domain.Services.Messaging;

public sealed class OutboxDispatchService(TrueSpendDbContext db) : IOutboxDispatchService
{
    public async Task<IReadOnlyList<PendingOutboxEvent>> GetQueuedEventsAsync(int batchSize, CancellationToken cancellationToken)
    {
        var queuedStatusId = await GetEventStatusIdAsync(MessagingConstants.EventStatusQueued, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        return await db.EventOutbox.AsNoTracking()
            .Where(e => e.StatusId == queuedStatusId && e.AvailableAt <= now)
            .OrderBy(e => e.Id)
            .Take(batchSize)
            .Select(e => new PendingOutboxEvent(e.Id, e.EventType, e.Payload))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<OutboxSubscriptionRef>> GetActiveSubscriptionsAsync(string eventType, CancellationToken cancellationToken) =>
        await db.EventSubscriptions.AsNoTracking()
            .Where(s => s.IsActive && s.EventType == eventType)
            .Select(s => new OutboxSubscriptionRef(s.Id, s.ConsumerName))
            .ToListAsync(cancellationToken);

    public async Task FanOutEventAsync(int outboxEventId, IReadOnlyList<int> subscriptionIds, CancellationToken cancellationToken)
    {
        if (subscriptionIds.Count == 0)
        {
            await MarkEventNoSubscribersAsync(outboxEventId, cancellationToken);
            return;
        }

        var pendingDeliveryStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusPending, cancellationToken);
        var dispatchedEventStatusId = await GetEventStatusIdAsync(MessagingConstants.EventStatusDispatched, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var existingSubscriptionIds = await db.EventDeliveries.AsNoTracking()
            .Where(d => d.EventOutboxId == outboxEventId && subscriptionIds.Contains(d.EventSubscriptionId))
            .Select(d => d.EventSubscriptionId)
            .ToListAsync(cancellationToken);

        foreach (var subscriptionId in subscriptionIds.Where(id => !existingSubscriptionIds.Contains(id)))
        {
            db.EventDeliveries.Add(new EventDeliveryEntity
            {
                EventOutboxId = outboxEventId,
                EventSubscriptionId = subscriptionId,
                StatusId = pendingDeliveryStatusId,
                AttemptCount = 0,
                NextAttemptAt = now,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        var outbox = await db.EventOutbox.FirstAsync(e => e.Id == outboxEventId, cancellationToken);
        outbox.StatusId = dispatchedEventStatusId;
        outbox.DispatchedAt = now;
        outbox.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkEventNoSubscribersAsync(int outboxEventId, CancellationToken cancellationToken)
    {
        // No subscribers is not a failure — the producer fired-and-forgot. Marking as Succeeded
        // keeps the outbox metric (Failed count) meaningful for actual delivery failures.
        var succeededStatusId = await GetEventStatusIdAsync(MessagingConstants.EventStatusSucceeded, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var outbox = await db.EventOutbox.FirstAsync(e => e.Id == outboxEventId, cancellationToken);
        outbox.StatusId = succeededStatusId;
        outbox.SucceededAt = now;
        outbox.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PendingEventDelivery>> GetPendingDeliveriesAsync(int batchSize, CancellationToken cancellationToken)
    {
        var pendingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusPending, cancellationToken);
        var retryingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusRetrying, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        return await (
            from d in db.EventDeliveries.AsNoTracking()
            join s in db.EventSubscriptions.AsNoTracking() on d.EventSubscriptionId equals s.Id
            join e in db.EventOutbox.AsNoTracking() on d.EventOutboxId equals e.Id
            where (d.StatusId == pendingStatusId)
                  || (d.StatusId == retryingStatusId && d.NextAttemptAt != null && d.NextAttemptAt <= now)
            orderby d.Id
            select new PendingEventDelivery(d.Id, e.Id, s.Id, e.EventType, s.ConsumerName, e.Payload, d.AttemptCount, s.MaxRetries, s.RetryBackoffSeconds))
            .Take(batchSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ClaimDeliveryAsync(int deliveryId, CancellationToken cancellationToken)
    {
        var processingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusProcessing, cancellationToken);
        var pendingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusPending, cancellationToken);
        var retryingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusRetrying, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var rows = await db.EventDeliveries
            .Where(d => d.Id == deliveryId && (d.StatusId == pendingStatusId || d.StatusId == retryingStatusId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(d => d.StatusId, processingStatusId)
                    .SetProperty(d => d.AttemptCount, d => (short)(d.AttemptCount + 1))
                    .SetProperty(d => d.UpdatedAt, now),
                cancellationToken);
        return rows > 0;
    }

    public async Task MarkDeliverySucceededAsync(int deliveryId, CancellationToken cancellationToken)
    {
        var succeededStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusSucceeded, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        await db.EventDeliveries
            .Where(d => d.Id == deliveryId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(d => d.StatusId, succeededStatusId)
                    .SetProperty(d => d.SucceededAt, now)
                    .SetProperty(d => d.LastError, (string?)null)
                    .SetProperty(d => d.NextAttemptAt, (DateTimeOffset?)null)
                    .SetProperty(d => d.UpdatedAt, now),
                cancellationToken);
    }

    public async Task MarkDeliveryFailedAsync(int deliveryId, string error, DateTimeOffset? nextAttemptAt, bool deadLetter, CancellationToken cancellationToken)
    {
        var nextStatusId = deadLetter
            ? await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusDeadLettered, cancellationToken)
            : await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusRetrying, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var truncated = Truncate(error, 2000);

        await db.EventDeliveries
            .Where(d => d.Id == deliveryId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(d => d.StatusId, nextStatusId)
                    .SetProperty(d => d.LastError, truncated)
                    .SetProperty(d => d.NextAttemptAt, deadLetter ? (DateTimeOffset?)null : nextAttemptAt)
                    .SetProperty(d => d.DeadLetteredAt, deadLetter ? (DateTimeOffset?)now : null)
                    .SetProperty(d => d.UpdatedAt, now),
                cancellationToken);
    }

    public async Task RollupEventAsync(int outboxEventId, CancellationToken cancellationToken)
    {
        var pendingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusPending, cancellationToken);
        var processingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusProcessing, cancellationToken);
        var retryingStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusRetrying, cancellationToken);
        var succeededDeliveryStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusSucceeded, cancellationToken);
        var deadLetteredStatusId = await GetDeliveryStatusIdAsync(MessagingConstants.DeliveryStatusDeadLettered, cancellationToken);

        var deliveryStates = await db.EventDeliveries.AsNoTracking()
            .Where(d => d.EventOutboxId == outboxEventId)
            .Select(d => d.StatusId)
            .ToListAsync(cancellationToken);

        if (deliveryStates.Count == 0) return;
        if (deliveryStates.Any(s => s == pendingStatusId || s == processingStatusId || s == retryingStatusId))
            return;

        var anyDeadLettered = deliveryStates.Any(s => s == deadLetteredStatusId);
        var allSucceeded = deliveryStates.All(s => s == succeededDeliveryStatusId);

        string targetCode = anyDeadLettered
            ? MessagingConstants.EventStatusPartiallyFailed
            : allSucceeded
                ? MessagingConstants.EventStatusSucceeded
                : MessagingConstants.EventStatusPartiallyFailed;

        var targetStatusId = await GetEventStatusIdAsync(targetCode, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        await db.EventOutbox
            .Where(e => e.Id == outboxEventId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(e => e.StatusId, targetStatusId)
                    .SetProperty(e => e.SucceededAt, targetCode == MessagingConstants.EventStatusSucceeded ? (DateTimeOffset?)now : null)
                    .SetProperty(e => e.UpdatedAt, now),
                cancellationToken);
    }

    private async Task<short> GetEventStatusIdAsync(string code, CancellationToken cancellationToken)
    {
        var id = await db.EventOutboxStatuses.AsNoTracking()
            .Where(s => s.Code == code)
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (id == 0)
            throw new InvalidOperationException($"Lookup row missing: lookup.event_outbox_statuses where code = '{code}'.");
        return id;
    }

    private async Task<short> GetDeliveryStatusIdAsync(string code, CancellationToken cancellationToken)
    {
        var id = await db.EventDeliveryStatuses.AsNoTracking()
            .Where(s => s.Code == code)
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (id == 0)
            throw new InvalidOperationException($"Lookup row missing: lookup.event_delivery_statuses where code = '{code}'.");
        return id;
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
