using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcCatalogSyncOrchestrationJob(
    IRewardsCcCatalogSyncBusiness sync,
    ICardCatalogMappingReviewBusiness mappingReview)
{
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await sync.SyncIssuersAsync(now, cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        await sync.SyncCardProductsAsync(now, cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        await sync.SyncRewardRulesAsync(now, cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        await mappingReview.RunAsync(now, cancellationToken);
    }
}
