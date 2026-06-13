namespace TrueSpend.Api.ViewModels.Recommendations;

// The user's location + a search radius (metres). Pins are anchored to the user, not the viewport.
// RadiusMeters and Limit are optional; the business clamps them (radius max 10km, limit default 30/max 50).
public sealed record NearbyMerchantsRequestVm(
    decimal CenterLat,
    decimal CenterLng,
    int? RadiusMeters,
    int? Limit);
