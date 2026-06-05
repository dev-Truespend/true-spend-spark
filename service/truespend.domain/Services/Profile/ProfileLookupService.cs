using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.Profile;

namespace TrueSpend.Domain.Services.Profile;

public sealed class ProfileLookupService(TrueSpendDbContext db) : IProfileLookupService
{
    public Task<bool> CountryExistsAsync(string code, CancellationToken cancellationToken)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return db.Countries.AsNoTracking().AnyAsync(x => x.Code == normalized, cancellationToken);
    }

    public Task<bool> CurrencyExistsAsync(string code, CancellationToken cancellationToken)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return db.Currencies.AsNoTracking().AnyAsync(x => x.Code == normalized, cancellationToken);
    }
}
