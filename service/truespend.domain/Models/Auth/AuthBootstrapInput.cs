namespace TrueSpend.Domain.Models.Auth;

public sealed record AuthBootstrapInput(
    Guid UserId,
    string? Email,
    string? DisplayName,
    string? Locale,
    string? Timezone,
    string? CountryCode,
    DeviceInput? Device);
