using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Foursquare;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class FoursquareCatalogReadService(TrueSpendDbContext db) : IFoursquareCatalogReadService
{
    public async Task<IReadOnlyList<FoursquareCategoryBridgeEntity>> GetActiveCategoryBridgeAsync(CancellationToken cancellationToken) =>
        await db.FoursquareCategoryBridges.AsNoTracking()
            .Where(b => b.IsActive)
            .ToListAsync(cancellationToken);
}
