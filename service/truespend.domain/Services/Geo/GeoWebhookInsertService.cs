using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class GeoWebhookInsertService(TrueSpendDbContext db) : IGeoWebhookInsertService
{
    public async Task<int> RecordWebhookEventAsync(
        FoursquareWebhookInput input,
        Guid? userId,
        int? merchantId,
        CancellationToken cancellationToken)
    {
        var entity = new FoursquareWebhookEventEntity
        {
            FoursquareEventId = input.FoursquareEventId,
            EventType = input.EventType,
            FoursquareUserId = input.ExternalUserId,
            UserId = userId,
            MerchantId = merchantId,
            Payload = input.RawPayload,
            ReceivedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.FoursquareWebhookEvents.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<int> InsertLocationEventAsync(LocationEventEntity entity, CancellationToken cancellationToken)
    {
        db.LocationEvents.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<int> InsertNotificationAsync(NotificationEntity entity, CancellationToken cancellationToken)
    {
        db.Notifications.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task UpdateNotificationPayloadAsync(int notificationId, string payload, CancellationToken cancellationToken)
    {
        var entity = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
        if (entity is null) return;
        entity.Payload = payload;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkWebhookProcessedAsync(int webhookEventId, Guid? userId, int? merchantId, string? processingError, CancellationToken cancellationToken)
    {
        var entity = await db.FoursquareWebhookEvents
            .FirstOrDefaultAsync(x => x.Id == webhookEventId, cancellationToken);
        if (entity is null) return;
        entity.ProcessedAt = DateTimeOffset.UtcNow;
        entity.UserId = userId;
        entity.MerchantId = merchantId;
        entity.ProcessingError = processingError;
        await db.SaveChangesAsync(cancellationToken);
    }
}
