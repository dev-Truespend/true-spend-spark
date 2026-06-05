namespace TrueSpend.Domain.Models.Analytics;

public sealed record MissedRewardSummary(
    int Id,
    int TransactionId,
    string MerchantName,
    string? ActualCardName,
    string? BetterCardName,
    decimal ActualReward,
    decimal PotentialReward,
    decimal MissedReward,
    bool IsDismissed);
