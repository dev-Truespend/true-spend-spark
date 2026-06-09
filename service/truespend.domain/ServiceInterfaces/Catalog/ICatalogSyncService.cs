using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public sealed record CatalogUpsertCounts(int Created, int Updated);

public sealed record CardProductUpsertResult(int CardProductId, bool Created);

public interface ICatalogSyncService
{
    Task<short> UpsertIssuerByNameAsync(string issuerDisplayName, DateTimeOffset now, CancellationToken cancellationToken);

    Task<short> UpsertCategoryAsync(RewardsCcCategoryData category, DateTimeOffset now, CancellationToken cancellationToken);

    Task<CardProductUpsertResult> UpsertCardProductAsync(
        RewardsCcCardProductData product,
        short issuerId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<CatalogUpsertCounts> ReplaceRewardRulesForCardAsync(
        int cardProductId,
        IReadOnlyList<RewardsCcRewardRuleData> rules,
        IReadOnlyDictionary<string, short> categoryIdByProviderId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<short?> GetCapPeriodIdByCodeAsync(string? code, CancellationToken cancellationToken);
    Task<short?> GetNetworkIdByCodeAsync(string code, CancellationToken cancellationToken);
    Task<short?> GetRewardCurrencyIdByCodeAsync(string? code, CancellationToken cancellationToken);
}
