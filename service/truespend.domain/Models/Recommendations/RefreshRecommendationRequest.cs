namespace TrueSpend.Domain.Models.Recommendations;

public sealed record RefreshRecommendationRequest(int MerchantId, string? CategoryCode);
