using TrueSpend.Domain.Entities.Foursquare;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IFoursquareCatalogReadService
{
    // The active rows ARE the fetch allowlist + the FSQ-category -> internal-category map.
    Task<IReadOnlyList<FoursquareCategoryBridgeEntity>> GetActiveCategoryBridgeAsync(CancellationToken cancellationToken);
}
