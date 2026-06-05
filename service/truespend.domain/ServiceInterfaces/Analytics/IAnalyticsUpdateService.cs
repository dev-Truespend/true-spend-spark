using TrueSpend.Domain.Models.Analytics;

namespace TrueSpend.Domain.ServiceInterfaces.Analytics;

public interface IAnalyticsUpdateService
{
    Task UpsertSnapshotAsync(AnalyticsSnapshotUpsert snapshot, CancellationToken cancellationToken);
}
