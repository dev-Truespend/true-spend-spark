namespace TrueSpend.Domain.Models.Billing;

public sealed record PlanPricesResponse(IReadOnlyList<PlanPrice> Plans);
