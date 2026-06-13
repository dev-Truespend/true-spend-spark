namespace TrueSpend.Api.ViewModels.Recommendations;

// Map viewport (south-west + north-east corners) plus the centre to rank distance from. Limit is
// optional; the business clamps it (default 30, max 50).
public sealed record NearbyMerchantsRequestVm(
    decimal SwLat,
    decimal SwLng,
    decimal NeLat,
    decimal NeLng,
    decimal CenterLat,
    decimal CenterLng,
    int? Limit);
