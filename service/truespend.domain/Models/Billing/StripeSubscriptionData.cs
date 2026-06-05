namespace TrueSpend.Domain.Models.Billing;

public sealed record StripeSubscriptionData(
    string StripeSubscriptionId,
    string StripeCustomerId,
    string StripePriceId,
    string Status,
    DateTimeOffset CurrentPeriodStart,
    DateTimeOffset CurrentPeriodEnd,
    DateTimeOffset? TrialEnd,
    bool CancelAtPeriodEnd,
    DateTimeOffset? CanceledAt);
