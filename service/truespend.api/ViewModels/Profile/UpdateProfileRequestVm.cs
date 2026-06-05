namespace TrueSpend.Api.ViewModels.Profile;

public sealed record UpdateProfileRequestVm(
    string? DisplayName,
    string? Phone,
    string? CountryCode,
    string? CurrencyCode);
