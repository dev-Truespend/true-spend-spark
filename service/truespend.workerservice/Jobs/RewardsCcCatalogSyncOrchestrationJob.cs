using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcCatalogSyncOrchestrationJob(
    IRewardsCcCatalogSyncBusiness sync,
    ICardCatalogMappingReviewBusiness mappingReview,
    IPlaidCardCatalogMatchBusiness plaidCardCatalogMatch,
    IOptions<RewardsCcSeedOptions> seedOptions)
{
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var seed = seedOptions.Value.Seed;
        await sync.SyncSeededCardsAsync(seed, now, cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        await mappingReview.RunAsync(now, cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        // Back-fill: any user_cards still missing a catalog product id (linked
        // before the catalog had data) get matched now that the sync grew the
        // catalog. Cards that already had a product id are untouched.
        await plaidCardCatalogMatch.MatchAllOrphansAsync(now, cancellationToken);
    }
}
