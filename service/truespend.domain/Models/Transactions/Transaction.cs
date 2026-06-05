namespace TrueSpend.Domain.Models.Transactions;

public sealed record Transaction(
    int Id,
    string MerchantName,
    decimal Amount,
    string CurrencyCode,
    int CardId,
    string CardDisplayName,
    string? CategoryCode,
    string? CategoryName,
    DateOnly TransactionDate,
    TimeOnly? TransactionTime,
    string? LocationLabel,
    string Source,
    bool IsPending,
    string? SyncStatus,
    decimal? EarnedRewardAmount,
    string? EarnedRewardCurrency,
    decimal? MissedRewardAmount);
