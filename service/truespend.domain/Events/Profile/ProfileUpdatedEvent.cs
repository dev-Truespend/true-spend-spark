namespace TrueSpend.Domain.Events.Profile;

public sealed record ProfileUpdatedEvent(
    int Version,
    Guid UserId,
    string DisplayName,
    string? Phone,
    string? CountryCode,
    string? CurrencyCode,
    string? AvatarUrl);
