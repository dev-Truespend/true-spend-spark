using TrueSpend.Domain.Models.Billing;

namespace TrueSpend.Domain.ServiceInterfaces.Billing;

public interface IBillingUpdateService
{
    Task UpsertStripeCustomerAsync(Guid userId, StripeCustomerData payload, CancellationToken cancellationToken);
    Task<int?> UpsertSubscriptionAsync(Guid userId, StripeSubscriptionData payload, PlanPriceLookup planPrice, short statusId, CancellationToken cancellationToken);
    Task MarkSubscriptionCancelledAsync(string stripeSubscriptionId, short cancelledStatusId, CancellationToken cancellationToken);
    Task UpsertPaymentMethodAsync(Guid userId, int stripeCustomerRowId, StripePaymentMethodData payload, CancellationToken cancellationToken);
    Task DetachPaymentMethodAsync(string stripePaymentMethodId, CancellationToken cancellationToken);
    Task<short?> GetSubscriptionStatusIdAsync(string statusCode, CancellationToken cancellationToken);
}
