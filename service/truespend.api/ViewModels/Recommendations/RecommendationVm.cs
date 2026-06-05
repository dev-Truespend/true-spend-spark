using TrueSpend.Api.ViewModels.Merchants;

namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record RecommendationVm(
    int Id,
    MerchantVm Merchant,
    string CategoryCode,
    RecommendationCardVm RecommendedCard,
    string Reason,
    IReadOnlyList<RecommendationCardVm> RunnerUpCards,
    string? CoverageWarning);
