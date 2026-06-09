using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public interface IRewardsCcProvider
{
    Task<IReadOnlyList<RapidApiSearchResult>> SearchCardByNameAsync(string cardName, CancellationToken cancellationToken);
    Task<RapidApiCardDetail?> GetCardDetailAsync(string cardKey, CancellationToken cancellationToken);

    // Full-catalog enumeration: returns every card the provider knows about as lightweight
    // {cardKey, issuer, name} rows. Used by the full sync mode (seed empty) to drive per-card detail fetches.
    Task<IReadOnlyList<RapidApiSearchResult>> ListAllCardsAsync(CancellationToken cancellationToken);
}
