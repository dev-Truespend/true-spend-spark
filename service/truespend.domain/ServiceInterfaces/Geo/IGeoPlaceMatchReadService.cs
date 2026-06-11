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
}
