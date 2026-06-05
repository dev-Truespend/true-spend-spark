using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class RewardsCcCatalogSyncBusiness(
    IRewardsCcProvider provider,
    ICatalogSyncService catalogService,
    ILogger<RewardsCcCatalogSyncBusiness> logger) : IRewardsCcCatalogSyncBusiness
{
    public async Task<CatalogSyncResult> SyncIssuersAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        IReadOnlyList<RewardsCcIssuerData> issuers;
        try
        {
            issuers = await provider.GetIssuersAsync(cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            logger.LogError(ex, "RewardsCC issuer sync failed during provider call");
            return CatalogSyncResult.Empty with { Failed = 1 };
        }

        if (issuers.Count == 0) return CatalogSyncResult.Empty;

        var upsert = await catalogService.UpsertIssuersAsync(issuers, now, cancellationToken);
        var seen = issuers.Select(i => i.ProviderIssuerId).ToHashSet(StringComparer.Ordinal);
        var deactivated = await catalogService.DeactivateMissingIssuersAsync(seen, now, cancellationToken);
        return new CatalogSyncResult(issuers.Count, upsert.Created, upsert.Updated, deactivated, 0);
    }

    public async Task<CatalogSyncResult> SyncCardProductsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        IReadOnlyList<RewardsCcCardProductData> products;
        try
        {
            products = await provider.GetCardProductsAsync(cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            logger.LogError(ex, "RewardsCC card-product sync failed during provider call");
            return CatalogSyncResult.Empty with { Failed = 1 };
        }

        if (products.Count == 0) return CatalogSyncResult.Empty;

        var upsert = await catalogService.UpsertCardProductsAsync(products, now, cancellationToken);
        var seen = products.Select(p => p.ProviderCardId).ToHashSet(StringComparer.Ordinal);
        var deactivated = await catalogService.DeactivateMissingCardProductsAsync(seen, now, cancellationToken);
        var mappingReview = products.Count - (upsert.Created + upsert.Updated);
        return new CatalogSyncResult(products.Count, upsert.Created, upsert.Updated, deactivated, 0, Math.Max(0, mappingReview));
    }

    public async Task<CatalogSyncResult> SyncRewardRulesAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var cardLookups = await catalogService.GetCardProductIdLookupsAsync(cancellationToken);
        if (cardLookups.Count == 0) return CatalogSyncResult.Empty;

        var totalProcessed = 0;
        var totalCreated = 0;
        var totalUpdated = 0;
        var totalExpired = 0;
        var totalFailed = 0;

        foreach (var card in cardLookups)
        {
            if (cancellationToken.IsCancellationRequested) break;

            IReadOnlyList<RewardsCcRewardRuleData> rules;
            try
            {
                rules = await provider.GetRewardRulesAsync(card.RewardsCcId, cancellationToken);
            }
            catch (ExternalProviderAppException ex)
            {
                logger.LogWarning(ex, "RewardsCC reward-rule fetch failed for card {RewardsCcId}", card.RewardsCcId);
                totalFailed++;
                continue;
            }

            totalProcessed += rules.Count;
            if (rules.Count == 0) continue;

            var upsert = await catalogService.UpsertRewardRulesForCardAsync(card.CardProductId, rules, now, cancellationToken);
            totalCreated += upsert.Created;
            totalUpdated += upsert.Updated;

            var seenKeys = new List<(short?, decimal)>();
            foreach (var rule in rules)
            {
                var categoryId = await catalogService.GetCategoryIdByCodeAsync(rule.CategoryCode, cancellationToken);
                seenKeys.Add((categoryId, rule.Multiplier));
            }
            totalExpired += await catalogService.ExpireMissingRewardRulesAsync(card.CardProductId, seenKeys, now, cancellationToken);
        }

        return new CatalogSyncResult(totalProcessed, totalCreated, totalUpdated, totalExpired, totalFailed);
    }
}
