using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

// Placeholder returning shaped fixture POIs so the catalog sync and on-miss lookup flows run
// end-to-end without a Foursquare Places API key in development. Two sample chains exercise the
// chain-upsert and category-bridge paths; both carry the seed "Dining and Drinking" category id.
public sealed class FoursquarePlacesPlaceholderProvider : IFoursquarePlacesProvider
{
    private const string DiningCategoryId = "63be6904847c3692a84b9bb5";
    private const string DiningCategoryPath = "Dining and Drinking";

    private static IReadOnlyList<ProviderPlace> Sample(decimal lat, decimal lng) => new[]
    {
        new ProviderPlace(
            "foursquare", "fsq-placeholder-chipotle-1", "Chipotle Mexican Grill",
            "fsq-chain-chipotle", "Chipotle", DiningCategoryId, DiningCategoryPath,
            lat, lng, "123 Main St", "San Francisco", "CA", "94105", "US"),
        new ProviderPlace(
            "foursquare", "fsq-placeholder-starbucks-1", "Starbucks",
            "fsq-chain-starbucks", "Starbucks", DiningCategoryId, DiningCategoryPath,
            lat + 0.0004m, lng + 0.0004m, "200 Market St", "San Francisco", "CA", "94105", "US")
    };

    public Task<ProviderPlacesPage> SearchPlacesAsync(
        IReadOnlyCollection<string> foursquareCategoryIds,
        string region,
        string? cursor,
        int batchSize,
        CancellationToken cancellationToken) =>
        // Single page of fixture data; no pagination in the placeholder.
        Task.FromResult(new ProviderPlacesPage(Sample(37.7929m, -122.3971m), null));

    public Task<IReadOnlyList<ProviderPlace>> NearbySearchAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        IReadOnlyCollection<string> foursquareCategoryIds,
        CancellationToken cancellationToken) =>
        Task.FromResult(Sample(lat, lng));
}
