namespace TrueSpend.Api.ViewModels.Recommendations;

// A tapped map pin. CategoryCode/EstimatedAmount are optional — the server falls back to the
// resolved merchant's default category and a standard assumed spend.
public sealed record PlaceRecommendationRequestVm(
    string ProviderPlaceId,
    string Name,
    decimal Lat,
    decimal Lng,
    string? CategoryCode,
    decimal? EstimatedAmount);
