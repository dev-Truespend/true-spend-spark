using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.Services.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class RewardsCcCatalogSyncBusiness(
    IRewardsCcProvider provider,
    ICatalogSyncService catalogService,
    ILogger<RewardsCcCatalogSyncBusiness> logger) : IRewardsCcCatalogSyncBusiness
{
    public async Task<CatalogSyncResult> SyncSeededCardsAsync(
        IReadOnlyList<RewardsCcSeedEntry> seed,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        // Seed configured -> seed mode (search each configured card by name).
        // Seed empty       -> full mode (enumerate the entire provider catalog).
        return seed.Count == 0
            ? await SyncFullCatalogAsync(now, cancellationToken)
            : await SyncSeededAsync(seed, now, cancellationToken);
    }

    private async Task<CatalogSyncResult> SyncSeededAsync(
        IReadOnlyList<RewardsCcSeedEntry> seed,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var counters = new SyncCounters();

        foreach (var entry in seed)
        {
            foreach (var cardName in entry.Cards)
            {
                if (cancellationToken.IsCancellationRequested) break;

                var query = $"{entry.Issuer} {cardName}".Trim();
                counters.Processed++;

                RapidApiCardDetail? detail;
                try
                {
                    var searchResults = await provider.SearchCardByNameAsync(query, cancellationToken);
                    var match = PickBestMatch(searchResults, entry.Issuer, cardName);
                    if (match is null)
                    {
                        logger.LogWarning("RewardsCC search returned no match for '{Query}'", query);
                        counters.Failed++;
                        continue;
                    }
                    detail = await provider.GetCardDetailAsync(match.CardKey, cancellationToken);
                }
                catch (ExternalProviderAppException ex)
                {
                    logger.LogWarning(ex, "RewardsCC fetch failed for '{Query}'", query);
                    counters.Failed++;
                    continue;
                }

                await ApplyDetailAsync(detail, now, counters, cancellationToken);
            }
        }

        return counters.ToResult();
    }

    private async Task<CatalogSyncResult> SyncFullCatalogAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        IReadOnlyList<RapidApiSearchResult> allCards;
        try
        {
            allCards = await provider.ListAllCardsAsync(cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            logger.LogError(ex, "RewardsCC list-all-cards failed; aborting full catalog sync");
            return CatalogSyncResult.Empty;
        }

        var counters = new SyncCounters();

        foreach (var card in allCards)
        {
            if (cancellationToken.IsCancellationRequested) break;
            counters.Processed++;

            RapidApiCardDetail? detail;
            try
            {
                detail = await provider.GetCardDetailAsync(card.CardKey, cancellationToken);
            }
            catch (ExternalProviderAppException ex)
            {
                logger.LogWarning(ex, "RewardsCC detail fetch failed for '{CardKey}'", card.CardKey);
                counters.Failed++;
                continue;
            }

            await ApplyDetailAsync(detail, now, counters, cancellationToken);
        }

        return counters.ToResult();
    }

    private async Task ApplyDetailAsync(RapidApiCardDetail? detail, DateTimeOffset now, SyncCounters counters, CancellationToken cancellationToken)
    {
        if (detail is null)
        {
            counters.Failed++;
            return;
        }

        try
        {
            var (cardCreated, cardUpdated) = await UpsertCardAsync(detail, now, cancellationToken);
            if (cardCreated) counters.Created++; else if (cardUpdated) counters.Updated++;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RewardsCC upsert failed for '{CardKey}'", detail.CardKey);
            counters.Failed++;
        }
    }

    private sealed class SyncCounters
    {
        public int Processed;
        public int Created;
        public int Updated;
        public int Failed;

        public CatalogSyncResult ToResult() => new(Processed, Created, Updated, 0, Failed);
    }

    private async Task<(bool Created, bool Updated)> UpsertCardAsync(
        RapidApiCardDetail detail,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var mapped = RewardsCcMapper.Map(detail);

        var issuerId = await catalogService.UpsertIssuerByNameAsync(mapped.Card.IssuerDisplayName, now, cancellationToken);

        var categoryIdByProviderId = new Dictionary<string, short>(StringComparer.Ordinal);
        var distinctCategories = mapped.Categories
            .GroupBy(c => c.ProviderCategoryId)
            .Select(g => g.First());
        foreach (var category in distinctCategories)
        {
            if (cancellationToken.IsCancellationRequested) break;
            var categoryId = await catalogService.UpsertCategoryAsync(category, now, cancellationToken);
            categoryIdByProviderId[category.ProviderCategoryId] = categoryId;
        }

        var cardResult = await catalogService.UpsertCardProductAsync(mapped.Card, issuerId, now, cancellationToken);

        await catalogService.ReplaceRewardRulesForCardAsync(
            cardResult.CardProductId,
            mapped.Rules,
            categoryIdByProviderId,
            now,
            cancellationToken);

        return (cardResult.Created, !cardResult.Created);
    }

    private static RapidApiSearchResult? PickBestMatch(IReadOnlyList<RapidApiSearchResult> results, string issuer, string cardName)
    {
        if (results.Count == 0) return null;
        var normalizedIssuer = Normalize(issuer);
        var normalizedCard = Normalize(cardName);

        // Prefer same issuer + card name contains; fall back to issuer match; finally to first result.
        var issuerMatches = results.Where(r => Normalize(r.CardIssuer).Contains(normalizedIssuer)).ToList();
        var pool = issuerMatches.Count > 0 ? issuerMatches : results;
        return pool.FirstOrDefault(r => Normalize(r.CardName).Contains(normalizedCard)) ?? pool[0];
    }

    private static string Normalize(string value) =>
        new string((value ?? string.Empty).ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
}
