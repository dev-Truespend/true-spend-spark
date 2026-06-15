using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

// Persistence for personal-place (recurring dwell) detection. Read side feeds the clustering business;
// the upsert dedupes by proximity and caps the number of zones per user.
public interface IPersonalPlaceService
{
    Task<IReadOnlyList<Guid>> GetUsersWithRecentLocationAsync(DateTimeOffset since, CancellationToken cancellationToken);

    Task<IReadOnlyList<LocationPoint>> GetRecentLocationPointsAsync(Guid userId, DateTimeOffset since, CancellationToken cancellationToken);

    // True if an active, rewardable place sits within radiusMeters of the point — i.e. the recurring dwell
    // is a store/gym/coffee shop we'd recommend a card for, not a residence. Excludes such cells from
    // personal-place suppression.
    Task<bool> HasNearbyRewardableMerchantAsync(decimal lat, decimal lng, double radiusMeters, CancellationToken cancellationToken);

    // Upserts a recurring dwell zone: updates an existing place within its radius, else inserts a new one
    // while the user is under the per-user cap. Returns true if a row was written.
    Task<bool> UpsertRecurringDwellAsync(Guid userId, decimal centerLat, decimal centerLng, int visitCount, DateTimeOffset now, CancellationToken cancellationToken);
}
