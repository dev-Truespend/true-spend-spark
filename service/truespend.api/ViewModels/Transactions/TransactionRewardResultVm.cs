using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class TransactionRewardResultVm
{
    public decimal EarnedRate { get; init; }
    public MoneyVm EarnedAmount { get; init; } = null!;
    public string? RewardCurrencyCode { get; init; }
}
