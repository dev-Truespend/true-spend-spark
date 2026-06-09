namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidTransactionUpsertResult(
    int TransactionId,
    bool IsNew,
    int UserCardId,
    decimal Amount,
    DateOnly TransactionDate,
    string? CategoryCode,
    string? MerchantName);

public sealed record PlaidTransactionRemoveResult(int TransactionId, int UserCardId, decimal Amount, DateOnly TransactionDate);
