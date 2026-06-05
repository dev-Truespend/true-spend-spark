using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Analytics;

public sealed record MissedRewardVm(
    int Id,
    int TransactionId,
    string MerchantName,
    string? ActualCard,
    string? BetterCard,
    MoneyVm ActualReward,
    MoneyVm PotentialReward,
    MoneyVm MissedReward,
    bool IsDismissed);
