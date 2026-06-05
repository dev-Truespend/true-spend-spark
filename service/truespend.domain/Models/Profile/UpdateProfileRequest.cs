namespace TrueSpend.Domain.Models.Profile;

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? Phone,
    string? CountryCode,
    string? CurrencyCode);
