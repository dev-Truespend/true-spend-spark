namespace TrueSpend.Domain.Models.Billing;

public sealed record CheckoutSessionInput(
    Guid UserId,
    string? Email,
    string? ExistingStripeCustomerId,
    string StripePriceId,
    string ReturnContextCode,
    string SuccessUrl,
    string CancelUrl,
    int TrialDays);
