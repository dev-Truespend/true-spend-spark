using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Geo;

public interface IFoursquarePlacesCatalogSyncBusiness
{
    // Pre-loads foursquare.places / foursquare.chains from the provider for the configured regions,
    // fetching only the active foursquare.category_bridge categories. Idempotent (upsert by natural id).
    Task<FoursquareCatalogSyncResult> SyncPlacesAsync(CancellationToken cancellationToken);
}
