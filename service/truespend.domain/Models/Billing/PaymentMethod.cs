namespace TrueSpend.Domain.Models.Billing;

public sealed record PaymentMethod(
    int Id,
    string StripePaymentMethodId,
    string? Brand,
    string? LastFour,
    short? ExpMonth,
    short? ExpYear,
    bool IsDefault);
