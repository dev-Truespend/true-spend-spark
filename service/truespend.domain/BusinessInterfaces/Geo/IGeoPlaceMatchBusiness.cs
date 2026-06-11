using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Geo;

public interface IGeoPlaceMatchBusiness
{
    // DB-first (foursquare.places) confidence-gated nearest-merchant resolution for a custom arrival.
    // On a miss, calls the provider once, persists the result (source = on_demand_lookup), and re-matches.
    Task<PlaceMatch> ResolveAsync(
        decimal lat,
        decimal lng,
        decimal? accuracyMeters,
        int? dwellSeconds,
        string? movementState,
        CancellationToken cancellationToken);
}
