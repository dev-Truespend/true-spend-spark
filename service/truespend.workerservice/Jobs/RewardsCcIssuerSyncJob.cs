using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcIssuerSyncJob(IRewardsCcCatalogSyncBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncIssuersAsync(DateTimeOffset.UtcNow, cancellationToken);
}
