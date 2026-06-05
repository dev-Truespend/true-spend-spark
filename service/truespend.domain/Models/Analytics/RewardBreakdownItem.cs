namespace TrueSpend.Domain.Models.Analytics;

public sealed record RewardBreakdownItem(string Key, string Label, decimal Earned, decimal Missed);
