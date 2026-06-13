using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Business.Geo;

// Treats the device coordinate as an approximate arrival AREA, never the merchant's location: search a
// radius -> collect candidates -> rank by distance (+ dwell/movement signals) -> act on the confidence
// tier. Never "nearest POI wins". A wrong push is worse than no push, so ambiguity resolves down.
public sealed class GeoPlaceMatchBusiness(
    IGeoPlaceMatchReadService readService,
    IFoursquareCatalogReadService catalogReadService,
    IFoursquarePlacesProvider provider,
    IFoursquarePlacesWriteService writeService,
    ILogger<GeoPlaceMatchBusiness> logger) : IGeoPlaceMatchBusiness
{
    public async Task<PlaceMatch> ResolveAsync(
        decimal lat,
        decimal lng,
        decimal? accuracyMeters,
        int? dwellSeconds,
        string? movementState,
        CancellationToken cancellationToken)
    {
        var coarse = accuracyMeters.HasValue && accuracyMeters.Value > GeoConstants.AccuracyCoarseThresholdMeters;
        var radius = accuracyMeters.HasValue && accuracyMeters.Value > GeoConstants.AccuracyPreciseThresholdMeters
            ? GeoConstants.NearbyRadiusCoarseMeters
            : GeoConstants.NearbyRadiusPreciseMeters;

        var candidates = Rank(await readService.FindActiveCandidatesAsync(lat, lng, radius, cancellationToken), lat, lng, radius);

        // On miss: one provider call, persist (on_demand_lookup), then re-match from the tables.
        if (candidates.Count == 0)
        {
            await TryProviderLookupAsync(lat, lng, radius, cancellationToken);
            candidates = Rank(await readService.FindActiveCandidatesAsync(lat, lng, radius, cancellationToken), lat, lng, radius);
        }

        if (candidates.Count == 0)
        {
            return new PlaceMatch(false, null, null, null, ArrivalConfidenceTierEnum.None);
        }

        var best = candidates[0];
        var tier = ScoreTier(candidates, coarse, dwellSeconds, movementState);
        return new PlaceMatch(true, best.Name, best.Provider, best.ProviderPlaceId, tier);
    }

    private async Task TryProviderLookupAsync(decimal lat, decimal lng, int radius, CancellationToken cancellationToken)
    {
        try
        {
            var bridge = await catalogReadService.GetActiveCategoryBridgeAsync(cancellationToken);
            var categoryIds = bridge.Select(b => b.FoursquareCategoryId).ToList();
            var found = await provider.NearbySearchAsync(lat, lng, radius, categoryIds, cancellationToken);
            foreach (var place in found)
            {
                int? chainId = null;
                if (!string.IsNullOrWhiteSpace(place.ChainName) || !string.IsNullOrWhiteSpace(place.ProviderChainId))
                {
                    var (id, _) = await writeService.UpsertChainAsync(place.ProviderChainId, place.ChainName ?? place.Name, null, cancellationToken);
                    chainId = id;
                }
                await writeService.UpsertPlaceAsync(place, chainId, null, "on_demand_lookup", cancellationToken);
            }
        }
        catch (Exception ex)
        {
            // On-miss provider fallback is best-effort; a failure just means no candidate this arrival.
            logger.LogWarning(ex, "Geo place-match provider on-miss lookup failed at ({Lat},{Lng}).", lat, lng);
        }
    }

    private static IReadOnlyList<FoursquarePlaceCandidate> Rank(IReadOnlyList<FoursquarePlaceCandidate> raw, decimal lat, decimal lng, int radius)
    {
        var originLat = (double)lat;
        var originLng = (double)lng;
        return raw
            .Select(c => c with { DistanceMeters = Haversine(originLat, originLng, (double)c.Lat, (double)c.Lng) })
            .Where(c => c.DistanceMeters <= radius)
            .OrderBy(c => c.DistanceMeters)
            .ToList();
    }

    private static ArrivalConfidenceTierEnum ScoreTier(
        IReadOnlyList<FoursquarePlaceCandidate> ranked,
        bool coarseFix,
        int? dwellSeconds,
        string? movementState)
    {
        // Coarse fix or a dense/shared lot is never a confident single hit.
        if (coarseFix) return ArrivalConfidenceTierEnum.Low;
        if (ranked.Count >= GeoConstants.DenseLotCandidateThreshold) return ArrivalConfidenceTierEnum.Low;

        var best = ranked[0];
        var margin = ranked.Count >= 2 ? ranked[1].DistanceMeters - best.DistanceMeters : double.MaxValue;
        var tier = margin >= GeoConstants.HighConfidenceMarginMeters
            ? ArrivalConfidenceTierEnum.High
            : ArrivalConfidenceTierEnum.Medium;

        // Driving past with a short stop is a likely drive-by — demote a High to Medium. Drive-up
        // categories (gas stations) are exempt: a sub-minute in-vehicle stop there is the normal visit,
        // not a drive-by, so a clear closest drive-up candidate keeps its High tier (and its push).
        var isDriveUp = best.CategoryCode is not null && GeoConstants.DriveUpCategoryCodes.Contains(best.CategoryCode);
        if (tier == ArrivalConfidenceTierEnum.High
            && !isDriveUp
            && string.Equals(movementState, GeoConstants.MovementInVehicle, StringComparison.OrdinalIgnoreCase)
            && (dwellSeconds ?? 0) < GeoConstants.MinDwellSecondsForVehicle)
        {
            tier = ArrivalConfidenceTierEnum.Medium;
        }

        return tier;
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
