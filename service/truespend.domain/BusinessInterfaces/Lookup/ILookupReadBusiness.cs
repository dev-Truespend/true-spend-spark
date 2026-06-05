using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Lookup;

namespace TrueSpend.Domain.BusinessInterfaces.Lookup;

public interface ILookupReadBusiness
{
    Task<BusinessResponse<CurrenciesResponse>> GetCurrenciesAsync(CancellationToken cancellationToken);
    Task<BusinessResponse<PermissionStatesResponse>> GetPermissionStatesAsync(CancellationToken cancellationToken);
}
