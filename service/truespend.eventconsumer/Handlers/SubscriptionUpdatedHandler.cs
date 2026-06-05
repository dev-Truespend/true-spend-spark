using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class SubscriptionUpdatedHandler(
    IEntitlementCacheInvalidatorBusiness invalidator) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = BillingEventMapper.FromSubscriptionUpdatedJson(payloadJson);
        await invalidator.InvalidateAsync(contract.UserId, cancellationToken);
    }
}
