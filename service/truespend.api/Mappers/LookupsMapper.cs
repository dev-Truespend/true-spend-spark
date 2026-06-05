using TrueSpend.Api.ViewModels.Lookups;
using TrueSpend.Domain.Models.Lookup;

namespace TrueSpend.Api.Mappers;

public interface ILookupsMapper
{
    CurrenciesResponseVm ToCurrencies(CurrenciesResponse domain);
    PermissionStatesResponseVm ToPermissionStates(PermissionStatesResponse domain);
}

public sealed class LookupsMapper : ILookupsMapper
{
    public CurrenciesResponseVm ToCurrencies(CurrenciesResponse domain) =>
        new(domain.Currencies
            .Select(c => new CurrencyOptionVm(c.Code, c.DisplayName, c.Symbol))
            .ToList());

    public PermissionStatesResponseVm ToPermissionStates(PermissionStatesResponse domain) =>
        new(domain.PermissionStates
            .Select(s => new PermissionStateOptionVm(s.Code, s.DisplayName))
            .ToList());
}
