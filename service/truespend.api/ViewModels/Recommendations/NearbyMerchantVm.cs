namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record NearbyMerchantVm(
    string ProviderPlaceId,
    string Name,
    decimal Lat,
    decimal Lng,
    string? CategoryCode,
    string? CategoryName,
    string? ChainName);
