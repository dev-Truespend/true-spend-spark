namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record NearbyRecommendationRequestVm(
    decimal Lat,
    decimal Lng,
    decimal? AccuracyMeters,
    decimal? EstimatedAmount);
