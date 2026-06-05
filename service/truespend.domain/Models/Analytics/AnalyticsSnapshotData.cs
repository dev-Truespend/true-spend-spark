namespace TrueSpend.Domain.Models.Analytics;

public sealed record AnalyticsSnapshotData(
    decimal EarnedAmount,
    decimal MissedAmount,
    string EarnedCurrencyCode,
    string DailyBreakdownJson,
    string CategoryBreakdownJson);
