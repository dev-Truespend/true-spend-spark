namespace TrueSpend.Domain.Models.Geo;

// A map viewport (bounding box) plus the point to rank distance from (the viewport centre or the
// user's location). The business clamps Limit; null/<=0 falls back to the default.
public sealed record NearbyMerchantsRequest(
    decimal SwLat,
    decimal SwLng,
    decimal NeLat,
    decimal NeLng,
    decimal CenterLat,
    decimal CenterLng,
    int? Limit);
