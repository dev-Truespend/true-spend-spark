using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcCardProductSyncJob(IRewardsCcCatalogSyncBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncCardProductsAsync(DateTimeOffset.UtcNow, cancellationToken);
}
