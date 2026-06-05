namespace TrueSpend.Domain.Models.Recommendations;

public sealed record ResolveMerchantRequest(string Name, string Provider, string? ProviderPlaceId, decimal? Lat, decimal? Lng, string? Address);
