using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Models.Billing;

public sealed record PlanPrice(string PlanCode, string CountryCode, string PeriodCode, Money Amount, string? StripePriceId);
