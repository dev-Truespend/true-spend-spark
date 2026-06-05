using TrueSpend.Domain.Models.Analytics;

namespace TrueSpend.Domain.ServiceInterfaces.Analytics;

public interface IAnalyticsReadService
{
    Task<AnalyticsSnapshot?> GetSnapshotAsync(Guid userId, string periodCode, CancellationToken cancellationToken);
    Task<IReadOnlyList<MissedRewardSummary>> GetTopMissedRewardsAsync(Guid userId, DateOnly periodStart, DateOnly periodEnd, int limit, CancellationToken cancellationToken);
    Task<bool> PeriodExistsAsync(string periodCode, CancellationToken cancellationToken);
    Task<IReadOnlyList<(string Code, short Id, DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly PriorStart, DateOnly PriorEnd)>> GetAllPeriodsAsync(CancellationToken cancellationToken);
    Task<AnalyticsSnapshotData> ComputeSnapshotDataAsync(Guid userId, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken);
    Task<(decimal Earned, decimal Missed)> GetPeriodTotalsAsync(Guid userId, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken);
}
