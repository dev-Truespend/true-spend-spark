namespace TrueSpend.Domain.Models.Billing;

public sealed record PlanPriceLookup(
    short PlanId,
    string PlanCode,
    int PlanPriceId,
    int TrialDays,
    string? StripePriceId);
