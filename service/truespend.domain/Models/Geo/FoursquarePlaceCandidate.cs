namespace TrueSpend.Domain.Models.Geo;

// A foursquare.places row in range of an arrival coordinate, plus its computed distance. The
// place-match business ranks these and assigns a confidence tier.
public sealed record FoursquarePlaceCandidate(
    int Id,
    string Provider,
    string ProviderPlaceId,
    string Name,
    string? ChainName,
    short? CategoryId,
    decimal Lat,
    decimal Lng,
    double DistanceMeters);
