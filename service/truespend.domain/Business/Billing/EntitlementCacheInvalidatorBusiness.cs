using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Billing;

public sealed class EntitlementCacheInvalidatorBusiness(
    IMemoryCache cache,
    ILogger<EntitlementCacheInvalidatorBusiness> logger) : IEntitlementCacheInvalidatorBusiness
{
    public Task InvalidateAsync(Guid userId, CancellationToken cancellationToken)
    {
        cache.Remove(BillingConstants.EntitlementsCacheKey(userId));
        cache.Remove(BillingConstants.SubscriptionCacheKey(userId));
        logger.LogInformation("Invalidated entitlement + subscription cache for user {UserId}", userId);
        return Task.CompletedTask;
    }
}
