using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoPlaceMatchReadService
{
    // Active foursquare.places within a lat/lng bounding box around the arrival point (DistanceMeters
    // left 0 — the place-match business fills it with Haversine and ranks). Backed by the (lat, lng) index.
    Task<IReadOnlyList<FoursquarePlaceCandidate>> FindActiveCandidatesAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        CancellationToken cancellationToken);

    // Active, rewardable (category-resolved) foursquare.places within radiusMeters of the user's
    // location, ordered by proximity, capped at limit. Powers the home-screen merchant pins (anchored
    // to the user, not the viewport). Backed by the (lat, lng) index.
    Task<IReadOnlyList<NearbyMerchant>> FindNearbyMerchantsInRadiusAsync(
        decimal centerLat,
        decimal centerLng,
        int radiusMeters,
        int limit,
        CancellationToken cancellationToken);

    // Active, rewardable foursquare.places whose normalized_name matches the search term (ILIKE
    // '%term%', backed by the normalized_name trigram GIN index), ranked by proximity to the user and
    // capped at limit. Powers the home-screen place search; returns the same NearbyMerchant shape as the
    // map pins so a tapped result reuses the place → best-card path.
    Task<IReadOnlyList<NearbyMerchant>> SearchPlacesAsync(
        string normalizedQuery,
        decimal centerLat,
        decimal centerLng,
        int limit,
        CancellationToken cancellationToken);
}
