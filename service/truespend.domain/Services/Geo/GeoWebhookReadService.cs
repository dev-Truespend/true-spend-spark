using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class GeoWebhookReadService(TrueSpendDbContext db) : IGeoWebhookReadService
{
    public Task<bool> WebhookEventExistsAsync(string provider, string eventId, CancellationToken cancellationToken) =>
        db.FoursquareWebhookEvents.AsNoTracking().AnyAsync(x => x.Provider == provider && x.FoursquareEventId == eventId, cancellationToken);

    public async Task<Guid?> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalUserId)) return null;
        if (!Guid.TryParse(externalUserId, out var parsed)) return null;
        var exists = await db.Profiles.AsNoTracking().AnyAsync(p => p.UserId == parsed, cancellationToken);
        return exists ? parsed : null;
    }

    public async Task<short> GetNotificationTypeIdAsync(string code, CancellationToken cancellationToken) =>
        await db.NotificationTypes.AsNoTracking()
            .Where(t => t.Code == code && t.IsActive)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<bool> HasActiveCardsAsync(Guid userId, CancellationToken cancellationToken) =>
        db.UserCards.AsNoTracking().AnyAsync(c => c.UserId == userId && c.IsActive, cancellationToken);

    public Task<int> CountGeoRecommendationsSinceAsync(Guid userId, DateTimeOffset since, CancellationToken cancellationToken) =>
        (from rec in db.Recommendations.AsNoTracking().Where(r => r.UserId == userId && r.GeneratedAt >= since)
         join context in db.RecommendationContexts.AsNoTracking() on rec.ContextId equals context.Id
         where context.Code == RecommendationsConstants.GeofenceArrivalContextCode
         select rec.Id)
        .CountAsync(cancellationToken);

    public async Task<short> GetLocationEventTypeIdAsync(string code, CancellationToken cancellationToken)
    {
        var id = await db.LocationEventTypes.AsNoTracking()
            .Where(t => t.Code == code)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (id != 0) return id;
        return code == GeoConstants.GeofenceEnteredLocationEventCode
            ? (short)LocationEventTypeEnum.GeofenceEntered
            : (short)0;
    }

    public async Task<bool> HasCoveringAreaSessionAsync(Guid userId, decimal lat, decimal lng, DateTimeOffset now, CancellationToken cancellationToken)
    {
        // A user has at most a handful of active sessions; fetch and test coverage in memory (the circle
        // test isn't expressible in EF without PostGIS, which the MVP doesn't use).
        var active = await db.GeoAreaSessions.AsNoTracking()
            .Where(s => s.UserId == userId && s.ExpiresAt > now)
            .ToListAsync(cancellationToken);

        var originLat = (double)lat;
        var originLng = (double)lng;
        return active.Any(s =>
            Haversine(originLat, originLng, (double)s.CenterLat, (double)s.CenterLng) <= (double)s.RadiusMeters);
    }

    public async Task<bool> IsWithinPersonalPlaceAsync(Guid userId, decimal lat, decimal lng, CancellationToken cancellationToken)
    {
        var places = await db.PersonalPlaces.AsNoTracking()
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        var originLat = (double)lat;
        var originLng = (double)lng;
        return places.Any(p =>
            Haversine(originLat, originLng, (double)p.CenterLat, (double)p.CenterLng) <= (double)p.RadiusMeters);
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
}
