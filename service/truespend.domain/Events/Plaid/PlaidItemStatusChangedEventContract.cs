namespace TrueSpend.Domain.Events.Plaid;

public sealed record PlaidItemStatusChangedEventContract(
    int Version,
    int PlaidItemId,
    Guid UserId,
    string StatusCode,
    string? LastError,
    DateTimeOffset OccurredAt);
