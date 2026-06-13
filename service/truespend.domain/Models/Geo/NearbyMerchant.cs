namespace TrueSpend.Domain.Models.Geo;

// A rewardable foursquare.places row surfaced as a map pin on the home screen. No finance.merchants
// row is created here — the merchant is resolved only when the user taps the pin (place recommendation).
public sealed record NearbyMerchant(
    string ProviderPlaceId,
    string Name,
    decimal Lat,
    decimal Lng,
    string? CategoryCode,
    string? CategoryName,
    string? ChainName);
