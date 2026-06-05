namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IEntitlementCacheInvalidatorBusiness
{
    Task InvalidateAsync(Guid userId, CancellationToken cancellationToken);
}
