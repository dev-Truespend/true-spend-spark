namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record RecommendationResponseVm(
    RecommendationVm? Recommendation,
    HomeEmptyStateVm? EmptyState,
    IReadOnlyList<PortfolioCardVm>? Portfolio);
