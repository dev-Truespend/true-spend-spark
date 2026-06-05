namespace TrueSpend.Domain.Models.Recommendations;

public sealed record InStoreRecommendationRequest(int MerchantId, string? CategoryCode, decimal? EstimatedAmount);
