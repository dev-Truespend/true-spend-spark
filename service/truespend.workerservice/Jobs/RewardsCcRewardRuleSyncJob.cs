using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcRewardRuleSyncJob(IRewardsCcCatalogSyncBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncRewardRulesAsync(DateTimeOffset.UtcNow, cancellationToken);
}
