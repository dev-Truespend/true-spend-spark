namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record ResolveMerchantRequestVm(
    string Name,
    string Provider,
    string? ProviderPlaceId,
    decimal? Lat,
    decimal? Lng,
    string? Address);
