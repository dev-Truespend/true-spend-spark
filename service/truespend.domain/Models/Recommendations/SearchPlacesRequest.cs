namespace TrueSpend.Domain.Models.Recommendations;

// A name/brand search for rewardable places, biased toward the user's location. Returns the same
// NearbyMerchant pins the map uses, so a tapped result flows through the identical place → best-card
// path. Query is matched against foursquare.places.normalized_name; the business clamps Limit.
public sealed record SearchPlacesRequest(
    string Query,
    decimal CenterLat,
    decimal CenterLng,
    int? Limit);
