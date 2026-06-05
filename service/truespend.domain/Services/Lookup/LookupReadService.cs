using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Lookup;
using TrueSpend.Domain.ServiceInterfaces.Lookup;

namespace TrueSpend.Domain.Services.Lookup;

public sealed class LookupReadService(TrueSpendDbContext db) : ILookupReadService
{
    public async Task<IReadOnlyList<CurrencyOption>> GetCurrenciesAsync(CancellationToken cancellationToken)
    {
        var list = await db.Currencies.AsNoTracking()
            .OrderBy(x => x.Code)
            .Select(x => new CurrencyOption(x.Code, x.DisplayName, x.Symbol))
            .ToListAsync(cancellationToken);
        return list;
    }

    public async Task<IReadOnlyList<PermissionStateOption>> GetPermissionStatesAsync(CancellationToken cancellationToken)
    {
        var list = await db.PermissionStates.AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => new PermissionStateOption(x.Code, x.DisplayName))
            .ToListAsync(cancellationToken);
        return list;
    }
}
