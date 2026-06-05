namespace TrueSpend.Domain.Models.Profile;

public sealed record ProfileResponse(
    string DisplayName,
    string Email,
    string? Phone,
    string? AvatarUrl,
    string? CountryCode,
    string? CurrencyCode,
    string CurrentPlanCode);
