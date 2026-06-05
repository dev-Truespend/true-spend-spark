using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Analytics;

public sealed record MissedRewardsSummaryResponseVm(
    MoneyVm Missed,
    MoneyVm MissedDelta,
    MissedRewardVm[] TopMissedRewards);
