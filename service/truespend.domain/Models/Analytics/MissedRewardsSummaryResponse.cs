namespace TrueSpend.Domain.Models.Analytics;

public sealed record MissedRewardsSummaryResponse(
    decimal Missed,
    decimal MissedDelta,
    string CurrencyCode,
    IReadOnlyList<MissedRewardSummary> TopMissedRewards);
