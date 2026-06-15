using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Business.Geo;

// Clusters a user's recent location fixes on a coarse grid; a cell that recurs across enough DISTINCT days
// AND isn't sitting on a known rewardable merchant is a dwell zone (home/work). Deliberately simple and
// timezone-free: it labels recurring dwell, not precise home-vs-work — suppression only needs "the user
// lives/works here". Two guards keep it from suppressing places the user actually shops at:
//   1. Known-merchant exclusion — a cell on/at an active rewardable place is a favorite store/gym/coffee
//      shop (somewhere we WANT to push), not a residence, so it's dropped.
//   2. Distinct-day recurrence — a real home/work recurs across many days; a short burst of visits to one
//      spot doesn't, so it can't mint a permanent suppressor.
// The per-user cap and min-visit floor still apply on top.
public sealed class PersonalPlaceDetectionBusiness(
    IPersonalPlaceService service,
    ILogger<PersonalPlaceDetectionBusiness> logger) : IPersonalPlaceDetectionBusiness
{
    public async Task<int> DetectAllAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now.AddDays(-GeoConstants.PersonalPlaceLookbackDays);
        var users = await service.GetUsersWithRecentLocationAsync(since, cancellationToken);
        var total = 0;
        foreach (var userId in users)
        {
            cancellationToken.ThrowIfCancellationRequested();
            total += await DetectForUserAsync(userId, now, cancellationToken);
        }
        logger.LogInformation("Personal-place detection upserted {Count} dwell zones across {Users} users.", total, users.Count);
        return total;
    }

    public async Task<int> DetectForUserAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now.AddDays(-GeoConstants.PersonalPlaceLookbackDays);
        var points = await service.GetRecentLocationPointsAsync(userId, since, cancellationToken);
        if (points.Count < GeoConstants.PersonalPlaceMinVisits) return 0;

        var clusters = points
            .GroupBy(p => (
                Lat: Math.Round((double)p.Lat, GeoConstants.PersonalPlaceGridDecimals),
                Lng: Math.Round((double)p.Lng, GeoConstants.PersonalPlaceGridDecimals)))
            .Select(g => new
            {
                Count = g.Count(),
                // Distinct calendar days (UTC) the cell was visited — recurrence, not raw frequency.
                DistinctDays = g.Select(p => p.OccurredAt.UtcDateTime.Date).Distinct().Count(),
                CenterLat = g.Average(p => (double)p.Lat),
                CenterLng = g.Average(p => (double)p.Lng)
            })
            .Where(c => c.Count >= GeoConstants.PersonalPlaceMinVisits
                && c.DistinctDays >= GeoConstants.PersonalPlaceMinDistinctDays)
            // Most-recurring first, so the per-user cap keeps the strongest home/work signals.
            .OrderByDescending(c => c.DistinctDays)
            .ThenByDescending(c => c.Count)
            .ToList();

        var upserted = 0;
        foreach (var cluster in clusters)
        {
            if (upserted >= GeoConstants.PersonalPlaceMaxPerUser) break;

            // Known-merchant exclusion: a recurring dwell sitting on a rewardable place is a store/gym/
            // coffee shop the user frequents — somewhere we WANT to push a best card — not a residence.
            if (await service.HasNearbyRewardableMerchantAsync(
                    (decimal)cluster.CenterLat, (decimal)cluster.CenterLng,
                    GeoConstants.PersonalPlaceKnownMerchantRadiusMeters, cancellationToken))
            {
                continue;
            }

            if (await service.UpsertRecurringDwellAsync(userId, (decimal)cluster.CenterLat, (decimal)cluster.CenterLng, cluster.Count, now, cancellationToken))
            {
                upserted++;
            }
        }
        return upserted;
    }
}
