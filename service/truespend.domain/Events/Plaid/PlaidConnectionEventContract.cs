namespace TrueSpend.Domain.Events.Plaid;

public sealed record PlaidConnectionEventContract(
    int ConnectionId,
    Guid UserId,
    DateTimeOffset OccurredAt);
