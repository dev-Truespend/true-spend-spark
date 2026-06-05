namespace TrueSpend.Domain.Models.Analytics;

public sealed record RewardsSummaryResponse(
    decimal Earned,
    decimal Missed,
    decimal EarnedDelta,
    decimal MissedDelta,
    string CurrencyCode,
    IReadOnlyList<RewardBreakdownItem> DailyBreakdown,
    IReadOnlyList<RewardBreakdownItem> CategoryBreakdown,
    IReadOnlyList<MissedRewardSummary> TopMissedRewards);
