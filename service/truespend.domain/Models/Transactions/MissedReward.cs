using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Transactions;

public sealed record MissedReward(
    int Id,
    int TransactionId,
    string MerchantName,
    CardSummary ActualCard,
    CardSummary BetterCard,
    decimal ActualRewardAmount,
    decimal PotentialRewardAmount,
    decimal MissedAmount,
    bool IsDismissed);
