namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PlanFeatureVm(
    string Code,
    string DisplayName,
    string? Description,
    string ValueType,
    IReadOnlyList<PlanFeatureValueVm> ValuesByPlan);
