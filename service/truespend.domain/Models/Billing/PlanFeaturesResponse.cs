namespace TrueSpend.Domain.Models.Billing;

public sealed record PlanFeaturesResponse(IReadOnlyList<PlanFeature> Features);
