namespace TrueSpend.Api.ViewModels.Recommendations;

// Home-screen place search: a name/brand term biased toward the user's location. Returns the same
// NearbyMerchantVm pins the map uses. Limit is optional; the business clamps it.
public sealed record SearchPlacesRequestVm(
    string Query,
    decimal CenterLat,
    decimal CenterLng,
    int? Limit);
