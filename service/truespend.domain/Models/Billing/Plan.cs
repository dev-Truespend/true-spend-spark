namespace TrueSpend.Domain.Models.Billing;

public sealed record Plan(string Code, string DisplayName, string? Description, int TrialDays);
