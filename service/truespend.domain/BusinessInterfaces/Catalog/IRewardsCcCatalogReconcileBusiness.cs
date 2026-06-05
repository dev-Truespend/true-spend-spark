using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.BusinessInterfaces.Catalog;

public interface IRewardsCcCatalogReconcileBusiness
{
    Task<CatalogReconcileResult> ReconcileAsync(bool dryRun, DateTimeOffset now, CancellationToken cancellationToken);
}
