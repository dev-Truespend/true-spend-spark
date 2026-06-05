using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class MissedRewardVm
{
    public int Id { get; init; }
    public int TransactionId { get; init; }
    public string MerchantName { get; init; } = string.Empty;
    public CardSummaryVm ActualCard { get; init; } = null!;
    public CardSummaryVm BetterCard { get; init; } = null!;
    public MoneyVm ActualReward { get; init; } = null!;
    public MoneyVm PotentialReward { get; init; } = null!;
    public MoneyVm MissedReward { get; init; } = null!;
    public bool IsDismissed { get; init; }
}
