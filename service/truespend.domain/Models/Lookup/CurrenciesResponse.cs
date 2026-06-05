namespace TrueSpend.Domain.Models.Lookup;

public sealed record CurrenciesResponse(IReadOnlyList<CurrencyOption> Currencies);
