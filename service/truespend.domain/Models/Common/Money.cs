namespace TrueSpend.Domain.Models.Common;

public sealed record Money(decimal Amount, string CurrencyCode, string Display);
