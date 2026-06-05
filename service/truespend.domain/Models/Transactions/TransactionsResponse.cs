namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionsResponse(
    IReadOnlyList<Transaction> Transactions,
    bool EmptyState);
