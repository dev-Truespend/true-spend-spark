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
            select new FoursquarePlaceCandidate(
                p.Id, p.Provider, p.ProviderPlaceId, p.Name,
                c != null ? c.Name : null, p.CategoryId, p.Lat, p.Lng, 0d))
            .ToListAsync(cancellationToken);
    }
}
