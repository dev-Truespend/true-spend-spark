namespace TrueSpend.Domain.Entities.Insights;

public sealed class AnalyticsSnapshotEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short PeriodId { get; set; }
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal EarnedAmount { get; set; }
    public string EarnedCurrencyCode { get; set; } = "cash_back";
    public decimal MissedAmount { get; set; }
    public decimal PriorEarnedAmount { get; set; }
    public decimal PriorMissedAmount { get; set; }
    public string DailyBreakdown { get; set; } = "[]";
    public string CategoryBreakdown { get; set; } = "[]";
    public DateTimeOffset ComputedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
