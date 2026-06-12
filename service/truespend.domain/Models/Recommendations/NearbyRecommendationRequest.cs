namespace TrueSpend.Domain.Models.Recommendations;

// Foreground "open app -> nearby best card" request (03). The device sends its current coordinates;
// the server resolves the nearby merchant via foursquare.places (shared place-match) and builds the
// best-card recommendation. AccuracyMeters scales the search radius; EstimatedAmount tunes the reward math.
public sealed record NearbyRecommendationRequest(
    decimal Lat,
    decimal Lng,
    decimal? AccuracyMeters,
    decimal? EstimatedAmount);
