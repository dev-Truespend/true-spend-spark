namespace TrueSpend.Domain.Models.Geo;

// The user's location plus a search radius (metres). Pins are anchored to the user, not the map
// viewport. The business clamps RadiusMeters and Limit; null/<=0 falls back to defaults.
public sealed record NearbyMerchantsRequest(
    decimal CenterLat,
    decimal CenterLng,
    int? RadiusMeters,
    int? Limit);
