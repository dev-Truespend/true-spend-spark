namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record InStoreRecommendationRequestVm(int MerchantId, string? CategoryCode, decimal? EstimatedAmount);
