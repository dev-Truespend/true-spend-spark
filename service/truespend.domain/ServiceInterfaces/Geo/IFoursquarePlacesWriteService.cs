using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

// Shared upsert surface for foursquare.chains / foursquare.places. Used by both the catalog sync
// job (source = catalog_sync) and the custom-arrival on-miss live lookup (source = on_demand_lookup).
// Upserts key on natural ids so re-runs/retries never duplicate.
public interface IFoursquarePlacesWriteService
{
    // Upsert by provider_chain_id (or normalized name when the provider has no chain id). Returns the
    // chain row id and whether it was newly created.
    Task<(int ChainId, bool Created)> UpsertChainAsync(
        string? providerChainId,
        string name,
        short? defaultCategoryId,
        CancellationToken cancellationToken);

    // Upsert by (provider, provider_place_id). Returns the place row id and whether it was newly created.
    Task<(int PlaceId, bool Created)> UpsertPlaceAsync(
        ProviderPlace place,
        int? chainId,
        short? categoryId,
        string source,
        CancellationToken cancellationToken);
}
