namespace TrueSpend.Domain.Models.Billing;

public sealed record CreateCheckoutSessionRequest(string PlanCode, string PeriodCode, string ReturnContextCode);
