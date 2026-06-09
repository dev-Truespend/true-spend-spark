using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.BusinessInterfaces.Catalog;

public interface IRewardsCcCatalogSyncBusiness
{
    Task<CatalogSyncResult> SyncSeededCardsAsync(
        IReadOnlyList<RewardsCcSeedEntry> seed,
        DateTimeOffset now,
        CancellationToken cancellationToken);
}
