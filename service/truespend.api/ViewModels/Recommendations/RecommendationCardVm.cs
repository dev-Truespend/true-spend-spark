using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record RecommendationCardVm(
    CardSummaryVm Card,
    decimal ExpectedRewardRate,
    MoneyVm ExpectedReward,
    string Reason,
    int Rank);
