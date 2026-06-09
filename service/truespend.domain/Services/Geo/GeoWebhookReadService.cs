using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class GeoWebhookReadService(TrueSpendDbContext db) : IGeoWebhookReadService
{
    public Task<bool> WebhookEventExistsAsync(string foursquareEventId, CancellationToken cancellationToken) =>
        db.FoursquareWebhookEvents.AsNoTracking().AnyAsync(x => x.FoursquareEventId == foursquareEventId, cancellationToken);

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
}
