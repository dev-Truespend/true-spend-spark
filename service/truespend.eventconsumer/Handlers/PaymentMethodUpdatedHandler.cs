using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class PaymentMethodUpdatedHandler(
    IBillingPaymentMethodCacheInvalidatorBusiness invalidator) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = BillingEventMapper.FromPaymentMethodUpdatedJson(payloadJson);
        await invalidator.InvalidateAsync(contract.UserId, cancellationToken);
    }
}
