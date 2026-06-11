namespace TrueSpend.Domain.Models.Geo;

// One page of a catalog-sync provider search. NextCursor is null when the provider has no more pages
// for the current (region, categories) tile.
public sealed record ProviderPlacesPage(
    IReadOnlyList<ProviderPlace> Places,
    string? NextCursor);
