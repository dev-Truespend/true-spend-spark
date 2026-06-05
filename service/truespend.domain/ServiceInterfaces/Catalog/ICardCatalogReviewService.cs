using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public interface ICardCatalogReviewService
{
    Task<int> UpsertReviewItemsAsync(
        IReadOnlyList<(string Provider, string ProviderCardId, string ReasonCode, decimal? Confidence, string? DetailsJson)> items,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<int> AutoResolvePendingItemsAsync(
        IReadOnlyCollection<(string Provider, string ProviderCardId)> resolvedKeys,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<(string ProviderIssuerId, string Name)>> GetIssuersMissingMappingAsync(
        string provider,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<(string ProviderCardId, string ProviderIssuerId, string Name)>> GetCardProductsMissingMappingAsync(
        string provider,
        CancellationToken cancellationToken);
}
