using TrueSpend.Domain.BusinessInterfaces.Lookup;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Lookup;
using TrueSpend.Domain.ServiceInterfaces.Lookup;

namespace TrueSpend.Domain.Business.Lookup;

public sealed class LookupReadBusiness(ILookupReadService readService) : ILookupReadBusiness
{
    public async Task<BusinessResponse<CurrenciesResponse>> GetCurrenciesAsync(CancellationToken cancellationToken)
    {
        var currencies = await readService.GetCurrenciesAsync(cancellationToken);
        return BusinessResponse<CurrenciesResponse>.Ok(new CurrenciesResponse(currencies));
    }

    public async Task<BusinessResponse<PermissionStatesResponse>> GetPermissionStatesAsync(CancellationToken cancellationToken)
    {
        var states = await readService.GetPermissionStatesAsync(cancellationToken);
        return BusinessResponse<PermissionStatesResponse>.Ok(new PermissionStatesResponse(states));
    }
}
