using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Business.Geo;

public sealed class FoursquarePlacesCatalogSyncBusiness(
    IFoursquareCatalogReadService readService,
    IFoursquarePlacesProvider provider,
    IFoursquarePlacesWriteService writeService,
    IOptions<FoursquarePlacesCatalogOptions> optionsAccessor,
    ILogger<FoursquarePlacesCatalogSyncBusiness> logger) : IFoursquarePlacesCatalogSyncBusiness
{
    // Safety bound so a misbehaving provider cursor can't loop forever per region.
    private const int MaxPagesPerRegion = 200;

    public async Task<FoursquareCatalogSyncResult> SyncPlacesAsync(CancellationToken cancellationToken)
    {
        var options = optionsAccessor.Value;

        // The active, mapped rows of foursquare.category_bridge ARE the fetch allowlist.
        var bridge = await readService.GetActiveCategoryBridgeAsync(cancellationToken);
        if (bridge.Count == 0)
        {
            logger.LogInformation("FoursquarePlacesCatalogSync: no active category_bridge rows; nothing to fetch.");
            return new FoursquareCatalogSyncResult("succeeded", options.Mode, 0, 0, 0, 0, 0, 0);
        }

        var categoryIds = bridge.Select(b => b.FoursquareCategoryId).ToList();
        // Exact FSQ-category-id -> internal category id. Descendant leaves won't match a parent row by
        // id (no taxonomy on hand), so they persist with category_id null (pending) and earn base rate.
        var categoryMap = bridge
            .Where(b => b.CategoryId.HasValue)
            .ToDictionary(b => b.FoursquareCategoryId, b => b.CategoryId);

        var regions = options.Regions.Length > 0 ? options.Regions : ["US"];
        if (!string.Equals(options.Mode, "api", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("FoursquarePlacesCatalogSync: mode '{Mode}' not wired in MVP; using 'api'.", options.Mode);
        }

        var processed = 0;
        var placesCreated = 0;
        var placesUpdated = 0;
        var chainsCreated = 0;
        var chainsUpdated = 0;
        var skipped = 0;

        foreach (var region in regions)
        {
            string? cursor = null;
            var pages = 0;
            do
            {
                cancellationToken.ThrowIfCancellationRequested();
                var page = await provider.SearchPlacesAsync(categoryIds, region, cursor, options.BatchSize, cancellationToken);
                foreach (var place in page.Places)
                {
                    processed++;

                    short? categoryId = place.FoursquareCategoryId is not null
                        && categoryMap.TryGetValue(place.FoursquareCategoryId, out var mapped)
                        ? mapped
                        : null;
                    if (place.FoursquareCategoryId is null) skipped++;

                    int? chainId = null;
                    if (!string.IsNullOrWhiteSpace(place.ChainName) || !string.IsNullOrWhiteSpace(place.ProviderChainId))
                    {
                        var (id, created) = await writeService.UpsertChainAsync(
                            place.ProviderChainId,
                            place.ChainName ?? place.Name,
                            categoryId,
                            cancellationToken);
                        chainId = id;
                        if (created) chainsCreated++; else chainsUpdated++;
                    }

                    var (_, placeCreated) = await writeService.UpsertPlaceAsync(place, chainId, categoryId, "catalog_sync", cancellationToken);
                    if (placeCreated) placesCreated++; else placesUpdated++;
                }

                cursor = page.NextCursor;
                pages++;
            }
            while (cursor is not null && pages < MaxPagesPerRegion);
        }

        var result = new FoursquareCatalogSyncResult(
            "succeeded", options.Mode, processed, placesCreated, placesUpdated, chainsCreated, chainsUpdated, skipped);
        logger.LogInformation(
            "FoursquarePlacesCatalogSync done: processed={Processed} placesCreated={PlacesCreated} placesUpdated={PlacesUpdated} chainsCreated={ChainsCreated} chainsUpdated={ChainsUpdated} skipped={Skipped}",
            result.Processed, result.PlacesCreated, result.PlacesUpdated, result.ChainsCreated, result.ChainsUpdated, result.SkippedByCategoryFilter);
        return result;
    }
}
