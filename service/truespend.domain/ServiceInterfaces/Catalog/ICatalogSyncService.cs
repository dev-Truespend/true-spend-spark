using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public sealed record CatalogUpsertCounts(int Created, int Updated);

public sealed record CardProductIdLookup(int CardProductId, string RewardsCcId);

public interface ICatalogSyncService
{
    Task<CatalogUpsertCounts> UpsertIssuersAsync(
        IReadOnlyList<RewardsCcIssuerData> issuers,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<int> DeactivateMissingIssuersAsync(
        IReadOnlyCollection<string> seenProviderIds,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<CatalogUpsertCounts> UpsertCardProductsAsync(
        IReadOnlyList<RewardsCcCardProductData> products,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<int> DeactivateMissingCardProductsAsync(
        IReadOnlyCollection<string> seenProviderIds,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CardProductIdLookup>> GetCardProductIdLookupsAsync(CancellationToken cancellationToken);

    Task<CatalogUpsertCounts> UpsertRewardRulesForCardAsync(
        int cardProductId,
        IReadOnlyList<RewardsCcRewardRuleData> rules,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<int> ExpireMissingRewardRulesAsync(
        int cardProductId,
        IReadOnlyCollection<(short? CategoryId, decimal Multiplier)> seenKeys,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<short?> GetCategoryIdByCodeAsync(string? code, CancellationToken cancellationToken);
    Task<short?> GetCapPeriodIdByCodeAsync(string? code, CancellationToken cancellationToken);
    Task<short?> GetNetworkIdByCodeAsync(string code, CancellationToken cancellationToken);
    Task<short?> GetRewardCurrencyIdByCodeAsync(string? code, CancellationToken cancellationToken);
}
