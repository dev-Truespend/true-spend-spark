namespace TrueSpend.Domain.Events.Transactions;

public sealed record TransactionEventContract(
    int TransactionId,
    Guid UserId,
    int UserCardId,
    string Source,
    decimal Amount,
    string? CategoryCode,
    DateOnly TransactionDate,
    string PayloadVersion = "1");
