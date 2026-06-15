using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class PersonalPlaceService(TrueSpendDbContext db) : IPersonalPlaceService
{
    private const double MetersPerDegreeLat = 111_320.0;

    public async Task<IReadOnlyList<Guid>> GetUsersWithRecentLocationAsync(DateTimeOffset since, CancellationToken cancellationToken) =>
        await db.LocationEvents.AsNoTracking()
            .Where(e => e.OccurredAt >= since)
            .Select(e => e.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<LocationPoint>> GetRecentLocationPointsAsync(Guid userId, DateTimeOffset since, CancellationToken cancellationToken) =>
        await db.LocationEvents.AsNoTracking()
            .Where(e => e.UserId == userId && e.OccurredAt >= since)
            .Select(e => new LocationPoint(e.Lat, e.Lng, e.OccurredAt))
            .ToListAsync(cancellationToken);

    public async Task<bool> HasNearbyRewardableMerchantAsync(decimal lat, decimal lng, double radiusMeters, CancellationToken cancellationToken)
    {
        // Bounding-box prefilter on the (lat,lng) index, then a precise Haversine check. Rewardable only
        // (CategoryId != null) — a non-actionable POI near home shouldn't block home detection; we only
        // care about places we'd actually push a card for.
        var dLat = (decimal)(radiusMeters / MetersPerDegreeLat);
        var cos = Math.Max(Math.Cos((double)lat * Math.PI / 180.0), 0.000001);
        var dLng = (decimal)(radiusMeters / (MetersPerDegreeLat * cos));
        var minLat = lat - dLat;
        var maxLat = lat + dLat;
        var minLng = lng - dLng;
        var maxLng = lng + dLng;

        var nearby = await db.FoursquarePlaces.AsNoTracking()
            .Where(p => p.IsActive && p.CategoryId != null
                && p.Lat >= minLat && p.Lat <= maxLat
                && p.Lng >= minLng && p.Lng <= maxLng)
            .Select(p => new { p.Lat, p.Lng })
            .ToListAsync(cancellationToken);

        var originLat = (double)lat;
        var originLng = (double)lng;
        return nearby.Any(p => Haversine(originLat, originLng, (double)p.Lat, (double)p.Lng) <= radiusMeters);
    }

    public async Task<bool> UpsertRecurringDwellAsync(Guid userId, decimal centerLat, decimal centerLng, int visitCount, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var existing = await db.PersonalPlaces
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        var originLat = (double)centerLat;
        var originLng = (double)centerLng;
        var match = existing.FirstOrDefault(p =>
            Haversine(originLat, originLng, (double)p.CenterLat, (double)p.CenterLng) <= (double)p.RadiusMeters);

        if (match is not null)
        {
            match.VisitCount = visitCount;
            match.LastDetectedAt = now;
            match.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (existing.Count >= GeoConstants.PersonalPlaceMaxPerUser)
        {
            return false;
        }

        db.PersonalPlaces.Add(new PersonalPlaceEntity
        {
            UserId = userId,
            CenterLat = centerLat,
            CenterLng = centerLng,
            RadiusMeters = (decimal)GeoConstants.PersonalPlaceRadiusMeters,
            Kind = GeoConstants.PersonalPlaceKindRecurringDwell,
            VisitCount = visitCount,
            LastDetectedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);
        return true;
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
