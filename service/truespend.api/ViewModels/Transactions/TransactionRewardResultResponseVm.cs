namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class TransactionRewardResultResponseVm
{
    public TransactionRewardResultVm? EarnedReward { get; init; }
    public MissedRewardVm? MissedReward { get; init; }
}
