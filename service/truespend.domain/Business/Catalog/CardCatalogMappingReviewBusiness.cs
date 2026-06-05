using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class CardCatalogMappingReviewBusiness(
    ICardCatalogReviewService reviewService) : ICardCatalogMappingReviewBusiness
{
    private const string Provider = "rewardsCc";

    public async Task<CardCatalogReviewResult> RunAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var items = new List<(string Provider, string ProviderCardId, string ReasonCode, decimal? Confidence, string? DetailsJson)>();

        foreach (var missing in await reviewService.GetIssuersMissingMappingAsync(Provider, cancellationToken))
        {
            items.Add((Provider, missing.ProviderIssuerId, CardCatalogReviewReasonCodes.MissingIssuerMapping, null, null));
        }

        foreach (var missing in await reviewService.GetCardProductsMissingMappingAsync(Provider, cancellationToken))
        {
            items.Add((Provider, missing.ProviderCardId, CardCatalogReviewReasonCodes.LowConfidenceProductMatch, null, null));
        }

        var created = await reviewService.UpsertReviewItemsAsync(items, now, cancellationToken);

        // Auto-resolve any pending items whose underlying mapping has now been satisfied.
        var resolvedKeys = items.Select(i => (i.Provider, i.ProviderCardId)).ToHashSet();
        var resolved = resolvedKeys.Count == 0
            ? 0
            : await reviewService.AutoResolvePendingItemsAsync(resolvedKeys, now, cancellationToken);

        return new CardCatalogReviewResult(created, resolved);
    }
}
