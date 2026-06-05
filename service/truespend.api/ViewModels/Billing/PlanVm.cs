namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PlanVm(string Code, string DisplayName, string? Description, int TrialDays);
