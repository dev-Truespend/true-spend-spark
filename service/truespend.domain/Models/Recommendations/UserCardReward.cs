using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Recommendations;

public sealed record UserCardReward(
    CardSummary Card,
    int? CardProductId,
    decimal BaseRate,
    IReadOnlyDictionary<string, decimal> RatesByCategory,
    string RewardCurrencyCode);
