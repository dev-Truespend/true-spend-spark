using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class TransactionVm
{
    public int Id { get; init; }
    public string MerchantName { get; init; } = string.Empty;
    public MoneyVm Amount { get; init; } = null!;
    public CardSummaryVm Card { get; init; } = null!;
    public string? CategoryCode { get; init; }
    public string? CategoryName { get; init; }
    public string TransactionDate { get; init; } = string.Empty;
    public string? TransactionTime { get; init; }
    public string? LocationLabel { get; init; }
    public string Source { get; init; } = string.Empty;
    public bool IsPending { get; init; }
    public MoneyVm? EarnedReward { get; init; }
    public MoneyVm? MissedReward { get; init; }
    public string? SyncStatus { get; init; }
}
