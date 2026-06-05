using TrueSpend.Domain.Models.Lookup;

namespace TrueSpend.Domain.ServiceInterfaces.Lookup;

public interface ILookupReadService
{
    Task<IReadOnlyList<CurrencyOption>> GetCurrenciesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<PermissionStateOption>> GetPermissionStatesAsync(CancellationToken cancellationToken);
}
