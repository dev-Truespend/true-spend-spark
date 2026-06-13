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

    public async Task<IReadOnlyList<NearbyMerchant>> FindNearbyMerchantsInRadiusAsync(
        decimal centerLat,
        decimal centerLng,
        int radiusMeters,
        int limit,
        CancellationToken cancellationToken)
    {
        // Pins are anchored to the user: a bounding box of centre ± radius (cheap btree prefilter on the
        // (lat,lng) index), then distance-ranked. Pins only ever exist around the user — the map shows
        // nothing once it's zoomed out past this radius (the client hides them).
        var dLat = (decimal)(radiusMeters / MetersPerDegreeLat);
        var cos = Math.Max(Math.Cos((double)centerLat * Math.PI / 180.0), 0.000001);
        var dLng = (decimal)(radiusMeters / (MetersPerDegreeLat * cos));
        var minLat = centerLat - dLat;
        var maxLat = centerLat + dLat;
        var minLng = centerLng - dLng;
        var maxLng = centerLng + dLng;

        // CategoryId != null means the bridge resolved a rewardable category on load, so every pin is
        // actionable. Order by squared-degree distance to the centre (monotonic with true distance over
        // this small radius — exact metres are not needed for ranking pins), then cap at limit.
        return await (
            from p in db.FoursquarePlaces.AsNoTracking()
            where p.IsActive
                && p.CategoryId != null
                && p.Lat >= minLat && p.Lat <= maxLat
                && p.Lng >= minLng && p.Lng <= maxLng
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

    public async Task<IReadOnlyList<NearbyMerchant>> SearchPlacesAsync(
        string normalizedQuery,
        decimal centerLat,
        decimal centerLng,
        int limit,
        CancellationToken cancellationToken)
    {
        // ILIKE '%term%' over normalized_name uses the normalized_name trigram GIN index (no bounding
        // box — the user may search a place outside the pin radius). Escape LIKE wildcards in the user's
        // term so '%'/'_' are matched literally. Rewardable-only (CategoryId != null) so every result is
        // actionable; ranked by squared-degree distance to the user (monotonic with true distance at
        // this scale — exact metres are not needed for ranking).
        var pattern = $"%{EscapeLike(normalizedQuery)}%";

        return await (
            from p in db.FoursquarePlaces.AsNoTracking()
            where p.IsActive
                && p.CategoryId != null
                && p.NormalizedName != null
                && EF.Functions.ILike(p.NormalizedName, pattern, "\\")
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

    // Escape the LIKE/ILIKE wildcards so a user typing '%' or '_' matches them literally (escape char '\').
    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
