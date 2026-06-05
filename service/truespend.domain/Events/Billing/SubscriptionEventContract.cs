namespace TrueSpend.Domain.Events.Billing;

public sealed record SubscriptionEventContract(
    int SubscriptionId,
    Guid UserId,
    string PlanCode,
    string Status,
    DateTimeOffset? TrialEnd,
    DateTimeOffset? CurrentPeriodEnd,
    bool CancelAtPeriodEnd,
    DateTimeOffset OccurredAt);
