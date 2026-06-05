namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidTransactionData(
    string PlaidTransactionId,
    string PlaidAccountId,
    string? MerchantName,
    decimal Amount,
    DateOnly Date,
    bool IsPending,
    string? Description);
