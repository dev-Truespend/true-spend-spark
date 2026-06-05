namespace TrueSpend.Domain.Models.Billing;

public sealed record PortalSessionInput(
    string StripeCustomerId,
    string ReturnUrl);
