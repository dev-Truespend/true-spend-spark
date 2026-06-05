namespace TrueSpend.Api.ViewModels.Billing;

public sealed record CreateCheckoutSessionRequestVm(string PlanCode, string PeriodCode, string ReturnContextCode);
