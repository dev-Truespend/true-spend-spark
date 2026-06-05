namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class TransactionDetailResponseVm
{
    public TransactionVm Transaction { get; init; } = null!;
    public TransactionRewardResultVm? RewardResult { get; init; }
    public MissedRewardVm? MissedReward { get; init; }
}
