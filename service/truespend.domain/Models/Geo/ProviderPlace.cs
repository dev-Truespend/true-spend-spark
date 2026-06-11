namespace TrueSpend.Domain.Models.Geo;

// Provider-neutral POI shape returned by IFoursquarePlacesProvider. Both the catalog sync (batch)
// and the on-miss live lookup return this; the read-through upsert maps it into foursquare.places.
public sealed record ProviderPlace(
    string Provider,
    string ProviderPlaceId,
    string Name,
    string? ProviderChainId,
    string? ChainName,
    string? FoursquareCategoryId,
    string? FoursquareCategoryPath,
    decimal Lat,
    decimal Lng,
    string? Address,
    string? Locality,
    string? Region,
    string? PostalCode,
    string? Country);
