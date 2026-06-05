namespace TrueSpend.Api.ViewModels.Common;

public sealed record ProfileResponseVm(
    string DisplayName,
    string Email,
    string? Phone,
    string? AvatarUrl,
    string? CountryCode,
    string? CurrencyCode,
    string CurrentPlanCode);
