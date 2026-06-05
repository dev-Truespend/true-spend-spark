namespace TrueSpend.Domain.Events.Plaid;

public sealed record PlaidItemNewAccountsAvailableEventContract(
    int Version,
    int PlaidItemId,
    Guid UserId,
    DateTimeOffset OccurredAt);
