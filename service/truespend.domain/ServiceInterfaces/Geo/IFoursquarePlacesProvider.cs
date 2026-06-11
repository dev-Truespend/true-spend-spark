using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

// External POI provider. Serves two callers behind one interface (10a / job-architecture):
//   - FoursquarePlacesCatalogSyncBusiness (batch `api` mode) via SearchPlacesAsync.
//   - The custom-arrival on-miss live lookup via NearbySearchAsync.
// A real implementation calls the Foursquare Places API; an on-miss swap to Google/Overture
// stays behind this same interface. The placeholder returns shaped fixture data so flows run
// without credentials.
public interface IFoursquarePlacesProvider
{
    // Catalog sync: one page of places in `region` for the given FSQ category ids. cursor is the
    // provider's pagination token (null on first call); the page's NextCursor drives the next call.
    Task<ProviderPlacesPage> SearchPlacesAsync(
        IReadOnlyCollection<string> foursquareCategoryIds,
        string region,
        string? cursor,
        int batchSize,
        CancellationToken cancellationToken);

    // On-miss live lookup: candidate places within radiusMeters of the arrival coordinate, filtered
    // to the fetch-allowlist categories. At most one call per new place; the result is persisted.
    Task<IReadOnlyList<ProviderPlace>> NearbySearchAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        IReadOnlyCollection<string> foursquareCategoryIds,
        CancellationToken cancellationToken);
}
