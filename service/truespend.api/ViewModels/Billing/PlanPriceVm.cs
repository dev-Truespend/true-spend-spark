using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Billing;

public sealed record PlanPriceVm(string PlanCode, string CountryCode, string PeriodCode, MoneyVm Amount, string? StripePriceId);
