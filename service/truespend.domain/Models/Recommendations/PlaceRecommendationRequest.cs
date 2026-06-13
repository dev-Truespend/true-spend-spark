namespace TrueSpend.Domain.Models.Recommendations;

// A map pin the user tapped: resolve the merchant and build its best-card recommendation. No
// merchant_visit is recorded — tapping a pin is browsing, not an arrival.
public sealed record PlaceRecommendationRequest(
    string ProviderPlaceId,
    string Name,
    decimal Lat,
    decimal Lng,
    string? CategoryCode,
    decimal? EstimatedAmount);
