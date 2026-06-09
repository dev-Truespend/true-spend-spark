using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class RewardsCcCatalogReconcileBusiness(
    IRewardsCcCatalogSyncBusiness syncBusiness,
    IOptions<RewardsCcSeedOptions> seedOptions) : IRewardsCcCatalogReconcileBusiness
{
    // Reconcile re-runs the seeded sync. `dryRun` is recorded for telemetry but
    // the upsert path is the same — promotion to a true diff-only pass is
    // tracked as an open worker design gap (legacy comment carried over).
    public async Task<CatalogReconcileResult> ReconcileAsync(bool dryRun, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var seed = seedOptions.Value.Seed;
        var sync = await syncBusiness.SyncSeededCardsAsync(seed, now, cancellationToken);

        return new CatalogReconcileResult(
            Issuers: new CatalogReconcileBucket(0, 0, 0),
            Products: new CatalogReconcileBucket(sync.Created, sync.Updated, sync.Deactivated),
            RewardRules: new CatalogReconcileBucket(0, 0, 0),
            MappingReviewRequired: sync.MappingReviewRequired,
            AppliedChanges: !dryRun);
    }
}
