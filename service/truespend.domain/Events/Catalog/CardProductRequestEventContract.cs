namespace TrueSpend.Domain.Events.Catalog;

public sealed record CardProductRequestEventContract(
    int RequestId,
    Guid UserId,
    string IssuerName,
    string CardName,
    string Status,
    DateTimeOffset OccurredAt);
