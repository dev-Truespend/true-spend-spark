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

    // Active, rewardable (category-resolved) foursquare.places inside a map viewport bbox, ordered by
    // proximity to the given centre, capped at limit. Powers the home-screen merchant pins. Backed by
    // the (lat, lng) index.
    Task<IReadOnlyList<NearbyMerchant>> FindNearbyMerchantsInBoundsAsync(
        decimal swLat,
        decimal swLng,
        decimal neLat,
        decimal neLng,
        decimal centerLat,
        decimal centerLng,
        int limit,
        CancellationToken cancellationToken);
}
