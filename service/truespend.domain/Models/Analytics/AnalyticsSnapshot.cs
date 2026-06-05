namespace TrueSpend.Domain.Models.Analytics;

public sealed record AnalyticsSnapshot(
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal EarnedAmount,
    string EarnedCurrencyCode,
    decimal MissedAmount,
    decimal PriorEarnedAmount,
    decimal PriorMissedAmount,
    string DailyBreakdown,
    string CategoryBreakdown);
