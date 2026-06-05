namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PaymentMethodVm(
    int Id,
    string StripePaymentMethodId,
    string? Brand,
    string? LastFour,
    short? ExpMonth,
    short? ExpYear,
    bool IsDefault);
