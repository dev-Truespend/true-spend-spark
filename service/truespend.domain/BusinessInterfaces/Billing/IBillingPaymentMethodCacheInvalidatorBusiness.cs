namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IBillingPaymentMethodCacheInvalidatorBusiness
{
    Task InvalidateAsync(Guid userId, CancellationToken cancellationToken);
}
