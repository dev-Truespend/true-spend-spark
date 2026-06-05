namespace TrueSpend.Domain.Models.Billing;

public sealed record PlanFeature(string Code, string DisplayName, string? Description, string ValueType, IReadOnlyList<PlanFeatureValue> ValuesByPlan);
