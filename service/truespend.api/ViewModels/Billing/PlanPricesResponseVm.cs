namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PlanPricesResponseVm(IReadOnlyList<PlanPriceVm> Plans);
