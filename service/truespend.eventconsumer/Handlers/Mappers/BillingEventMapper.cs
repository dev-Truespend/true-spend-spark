using System.Text.Json;
using TrueSpend.Domain.Events.Billing;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class BillingEventMapper
{
    public static SubscriptionEventContract FromSubscriptionUpdatedJson(string payloadJson) =>
        JsonSerializer.Deserialize<SubscriptionEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid billing.subscription.updated payload");

    public static PaymentMethodEventContract FromPaymentMethodUpdatedJson(string payloadJson) =>
        JsonSerializer.Deserialize<PaymentMethodEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid billing.payment_method.updated payload");
}
