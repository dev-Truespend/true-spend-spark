using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class RewardsCcCatalogReconcileBusiness(
    IRewardsCcCatalogSyncBusiness syncBusiness) : IRewardsCcCatalogReconcileBusiness
{
    // Phase 1 reconcile is a wet-run alias for the nightly trio in order. Dry-run mode is
    // recorded but the underlying sync writes occur — promotion to a true diff-only pass is
    // tracked as an open design gap on the worker.
    public async Task<CatalogReconcileResult> ReconcileAsync(bool dryRun, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var issuers = await syncBusiness.SyncIssuersAsync(now, cancellationToken);
        var products = await syncBusiness.SyncCardProductsAsync(now, cancellationToken);
        var rules = await syncBusiness.SyncRewardRulesAsync(now, cancellationToken);

        return new CatalogReconcileResult(
            Issuers: new CatalogReconcileBucket(issuers.Created, issuers.Updated, issuers.Deactivated),
            Products: new CatalogReconcileBucket(products.Created, products.Updated, products.Deactivated),
            RewardRules: new CatalogReconcileBucket(rules.Created, rules.Updated, rules.Deactivated),
            MappingReviewRequired: products.MappingReviewRequired,
            AppliedChanges: !dryRun);
    }
}
