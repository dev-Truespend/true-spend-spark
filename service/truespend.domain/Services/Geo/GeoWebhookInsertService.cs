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
        GeoArrivalInput input,
        Guid? userId,
        int? merchantId,
        CancellationToken cancellationToken)
    {
        var entity = new FoursquareWebhookEventEntity
        {
            Provider = input.Provider,
            FoursquareEventId = input.EventId,
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

    public async Task<int> InsertArrivalDecisionAsync(GeoArrivalDecisionEntity entity, CancellationToken cancellationToken)
    {
        db.GeoArrivalDecisions.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<int> InsertAreaSessionAsync(GeoAreaSessionEntity entity, CancellationToken cancellationToken)
    {
        db.GeoAreaSessions.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<int> ExpireCoveringAreaSessionsAsync(Guid userId, decimal lat, decimal lng, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var active = await db.GeoAreaSessions
            .Where(s => s.UserId == userId && s.ExpiresAt > now)
            .ToListAsync(cancellationToken);

        var originLat = (double)lat;
        var originLng = (double)lng;
        var covering = active
            .Where(s => Haversine(originLat, originLng, (double)s.CenterLat, (double)s.CenterLng) <= (double)s.RadiusMeters)
            .ToList();
        if (covering.Count == 0) return 0;

        foreach (var session in covering)
        {
            session.ExpiresAt = now;
        }
        await db.SaveChangesAsync(cancellationToken);
        return covering.Count;
    }

    private static double Haversine(double lat1, double lng1, double lat2, double lng2)
    {
        const double earthRadiusMeters = 6_371_000d;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLng = (lng2 - lng1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
                * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return earthRadiusMeters * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
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
