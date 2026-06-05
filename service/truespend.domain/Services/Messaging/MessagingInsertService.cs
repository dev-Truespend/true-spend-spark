using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Messaging;

namespace TrueSpend.Domain.Services.Messaging;

public sealed class MessagingInsertService(TrueSpendDbContext db) : IMessagingInsertService
{
    public async Task EnqueueOutboxEventAsync(
        string eventType,
        string aggregateType,
        int? aggregateId,
        string payloadJson,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var statusId = await db.EventOutboxStatuses.AsNoTracking()
            .Where(s => s.Code == MessagingConstants.EventStatusQueued)
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (statusId == 0)
        {
            throw new InvalidOperationException(
                $"Lookup row missing: lookup.event_outbox_statuses where code = '{MessagingConstants.EventStatusQueued}'.");
        }

        db.EventOutbox.Add(new EventOutboxEntity
        {
            EventType = eventType,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Payload = payloadJson,
            IdempotencyKey = idempotencyKey,
            StatusId = statusId,
            AvailableAt = now,
            CreatedAt = now,
            UpdatedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}
