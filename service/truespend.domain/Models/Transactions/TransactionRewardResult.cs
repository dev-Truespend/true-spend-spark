namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionRewardResult(
    decimal EarnedRate,
    decimal EarnedAmount,
    string? RewardCurrencyCode,
    int? RuleAppliedId);
