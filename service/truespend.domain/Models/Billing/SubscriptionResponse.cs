namespace TrueSpend.Domain.Models.Billing;

public sealed record SubscriptionResponse(string PlanCode, string Status, DateTimeOffset? TrialEnd, DateTimeOffset? CurrentPeriodEnd, bool CancelAtPeriodEnd);
