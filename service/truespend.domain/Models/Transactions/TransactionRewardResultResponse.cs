namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionRewardResultResponse(
    TransactionRewardResult? EarnedReward,
    MissedReward? MissedReward);
