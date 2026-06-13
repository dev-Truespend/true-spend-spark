using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

// No-op provider used when no Foursquare Places API key is configured. It deliberately returns
// NO places: the loaded foursquare.places tables (4M+ rows) are the source of truth, and we never
// fabricate merchants that do not exist in the DB. On a tables miss the geo flow simply finds no
// candidate (ArrivalConfidenceTierEnum.None) → no recommendation, no map pins. Configure
// Foursquare:PlacesApiKey to swap in the real FoursquarePlacesProvider for live on-miss lookups.
public sealed class FoursquarePlacesPlaceholderProvider : IFoursquarePlacesProvider
{
    public Task<ProviderPlacesPage> SearchPlacesAsync(
        IReadOnlyCollection<string> foursquareCategoryIds,
        string region,
        string? cursor,
        int batchSize,
        CancellationToken cancellationToken) =>
        Task.FromResult(new ProviderPlacesPage(Array.Empty<ProviderPlace>(), null));

    public Task<IReadOnlyList<ProviderPlace>> NearbySearchAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        IReadOnlyCollection<string> foursquareCategoryIds,
        CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<ProviderPlace>>(Array.Empty<ProviderPlace>());
}
