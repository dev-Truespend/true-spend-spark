using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsCacheInvalidatorBusiness(
    IMemoryCache cache,
    ILogger<CardsCacheInvalidatorBusiness> logger) : ICardsCacheInvalidatorBusiness
{
    public Task InvalidateAsync(Guid userId, CancellationToken cancellationToken)
    {
        cache.Remove(CardsConstants.CardsListCacheKey(userId));
        cache.Remove(CardsConstants.PlaidConnectionsCacheKey(userId));
        logger.LogInformation("Invalidated cards + plaid connection cache for user {UserId}", userId);
        return Task.CompletedTask;
    }
}
