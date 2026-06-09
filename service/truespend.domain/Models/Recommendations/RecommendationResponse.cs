namespace TrueSpend.Domain.Models.Recommendations;

public sealed record RecommendationResponse(
    Recommendation? Recommendation,
    HomeEmptyState? EmptyState,
    IReadOnlyList<PortfolioCard>? Portfolio = null);
