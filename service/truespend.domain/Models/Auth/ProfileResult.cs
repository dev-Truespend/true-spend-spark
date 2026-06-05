namespace TrueSpend.Domain.Models.Auth;

public sealed record ProfileResult(
    string DisplayName,
    string Email,
    string? Phone,
    string? AvatarUrl,
    string? CountryCode,
    string? CurrencyCode,
    string CurrentPlanCode);
