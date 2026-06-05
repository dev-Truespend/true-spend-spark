namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class MissedRewardEventsResponseVm
{
    public IReadOnlyList<MissedRewardVm> MissedRewards { get; init; } = [];
}
