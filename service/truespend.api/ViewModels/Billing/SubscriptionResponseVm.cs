namespace TrueSpend.Api.ViewModels.Billing;

public sealed record SubscriptionResponseVm(
    string PlanCode,
    string Status,
    DateTimeOffset? TrialEnd,
    DateTimeOffset? CurrentPeriodEnd,
    bool CancelAtPeriodEnd);
