using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class GeoPlaceMatchReadService(TrueSpendDbContext db) : IGeoPlaceMatchReadService
{
    private const double MetersPerDegreeLat = 111_320.0;

    public async Task<IReadOnlyList<FoursquarePlaceCandidate>> FindActiveCandidatesAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        CancellationToken cancellationToken)
    {
        var dLat = (decimal)(radiusMeters / MetersPerDegreeLat);
        var cos = Math.Max(Math.Cos((double)lat * Math.PI / 180.0), 0.000001);
        var dLng = (decimal)(radiusMeters / (MetersPerDegreeLat * cos));

        var minLat = lat - dLat;
        var maxLat = lat + dLat;
        var minLng = lng - dLng;
        var maxLng = lng + dLng;

        return await (
            from p in db.FoursquarePlaces.AsNoTracking()
            where p.IsActive
                && p.Lat >= minLat && p.Lat <= maxLat
                && p.Lng >= minLng && p.Lng <= maxLng
            join c in db.FoursquareChains.AsNoTracking() on p.ChainId equals c.Id into chains
            from c in chains.DefaultIfEmpty()
            join cat in db.Categories.AsNoTracking() on p.CategoryId equals (short?)cat.Id into cats
            from cat in cats.DefaultIfEmpty()
            select new FoursquarePlaceCandidate(
                p.Id, p.Provider, p.ProviderPlaceId, p.Name,
                c != null ? c.Name : null, p.CategoryId, cat != null ? cat.Code : null,
                p.Lat, p.Lng, 0d))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NearbyMerchant>> FindNearbyMerchantsInBoundsAsync(
        decimal swLat,
        decimal swLng,
        decimal neLat,
        decimal neLng,
        decimal centerLat,
        decimal centerLng,
        int limit,
        CancellationToken cancellationToken)
    {
        // CategoryId != null means the bridge resolved a rewardable category on load, so every pin is
        // actionable. Order by squared-degree distance to the centre (monotonic with true distance over
        // a single viewport — exact metres are not needed for ranking pins), then cap at limit.
        return await (
            from p in db.FoursquarePlaces.AsNoTracking()
            where p.IsActive
                && p.CategoryId != null
                && p.Lat >= swLat && p.Lat <= neLat
                && p.Lng >= swLng && p.Lng <= neLng
            join ch in db.FoursquareChains.AsNoTracking() on p.ChainId equals ch.Id into chains
            from ch in chains.DefaultIfEmpty()
            join cat in db.Categories.AsNoTracking() on p.CategoryId equals (short?)cat.Id into cats
            from cat in cats.DefaultIfEmpty()
            orderby (p.Lat - centerLat) * (p.Lat - centerLat) + (p.Lng - centerLng) * (p.Lng - centerLng)
            select new NearbyMerchant(
                p.ProviderPlaceId,
                p.Name,
                p.Lat,
                p.Lng,
                cat != null ? cat.Code : null,
                cat != null ? cat.DisplayName : null,
                ch != null ? ch.Name : null))
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
