namespace TrueSpend.Domain.Models.Billing;

public sealed record StripePaymentMethodData(
    string StripePaymentMethodId,
    string StripeCustomerId,
    string? Brand,
    string? LastFour,
    short? ExpMonth,
    short? ExpYear,
    bool Detached);
