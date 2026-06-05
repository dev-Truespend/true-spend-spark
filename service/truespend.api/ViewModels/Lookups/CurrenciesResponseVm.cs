namespace TrueSpend.Api.ViewModels.Lookups;

public sealed record CurrencyOptionVm(string Code, string DisplayName, string Symbol);

public sealed record CurrenciesResponseVm(IReadOnlyList<CurrencyOptionVm> Currencies);
