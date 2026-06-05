namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionDetailResponse(
    TransactionDetail Transaction,
    TransactionRewardResult? RewardResult,
    MissedReward? MissedReward);
