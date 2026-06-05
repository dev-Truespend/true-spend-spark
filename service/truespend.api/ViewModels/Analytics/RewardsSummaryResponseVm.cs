using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Analytics;

public sealed record RewardsSummaryResponseVm(
    MoneyVm Earned,
    MoneyVm Missed,
    MoneyVm EarnedDelta,
    MoneyVm MissedDelta,
    RewardBreakdownItemVm[] DailyBreakdown,
    RewardBreakdownItemVm[] CategoryBreakdown,
    MissedRewardVm[] TopMissedRewards);
