namespace TrueSpend.Domain.Models.Recommendations;

public sealed record Recommendation(
    int Id,
    Merchant Merchant,
    string CategoryCode,
    RecommendationCard RecommendedCard,
    string Reason,
    IReadOnlyList<RecommendationCard> RunnerUpCards,
    string? CoverageWarning);
