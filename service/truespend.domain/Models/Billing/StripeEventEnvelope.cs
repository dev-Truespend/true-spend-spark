namespace TrueSpend.Domain.Models.Billing;

public sealed record StripeEventEnvelope(
    string StripeEventId,
    string EventType,
    StripeSubscriptionData? Subscription,
    StripePaymentMethodData? PaymentMethod,
    StripeCustomerData? Customer);
