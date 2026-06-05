using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Analytics;

public sealed record RewardBreakdownItemVm(string Key, string Label, MoneyVm Earned, MoneyVm Missed);
