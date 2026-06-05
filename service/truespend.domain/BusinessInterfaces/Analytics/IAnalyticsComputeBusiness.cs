namespace TrueSpend.Domain.BusinessInterfaces.Analytics;

public interface IAnalyticsComputeBusiness
{
    Task RecomputeSnapshotsAsync(Guid userId, CancellationToken cancellationToken);
}
