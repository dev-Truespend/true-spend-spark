namespace TrueSpend.Domain.Events.Billing;

public sealed record PaymentMethodEventContract(
    Guid UserId,
    string? StripePaymentMethodId,
    string EventType,
    DateTimeOffset OccurredAt);
