using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.BusinessInterfaces.Catalog;

public interface IRewardsCcCatalogSyncBusiness
{
    Task<CatalogSyncResult> SyncIssuersAsync(DateTimeOffset now, CancellationToken cancellationToken);
    Task<CatalogSyncResult> SyncCardProductsAsync(DateTimeOffset now, CancellationToken cancellationToken);
    Task<CatalogSyncResult> SyncRewardRulesAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
