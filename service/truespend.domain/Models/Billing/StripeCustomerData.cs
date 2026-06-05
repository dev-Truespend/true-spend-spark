namespace TrueSpend.Domain.Models.Billing;

public sealed record StripeCustomerData(
    string StripeCustomerId,
    string Email,
    Guid? UserId);
