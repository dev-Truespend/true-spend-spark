namespace TrueSpend.Domain.Models.Notifications;

public sealed record UnusualTransactionCandidate(
    int TransactionId,
    Guid UserId,
    decimal Amount,
    DateOnly TransactionDate);
