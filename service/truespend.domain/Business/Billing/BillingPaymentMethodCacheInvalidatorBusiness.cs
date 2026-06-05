using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Billing;

public sealed class BillingPaymentMethodCacheInvalidatorBusiness(
    IMemoryCache cache,
    ILogger<BillingPaymentMethodCacheInvalidatorBusiness> logger) : IBillingPaymentMethodCacheInvalidatorBusiness
{
    public Task InvalidateAsync(Guid userId, CancellationToken cancellationToken)
    {
        cache.Remove(BillingConstants.PaymentMethodsCacheKey(userId));
        logger.LogInformation("Invalidated payment-method cache for user {UserId}", userId);
        return Task.CompletedTask;
    }
}
