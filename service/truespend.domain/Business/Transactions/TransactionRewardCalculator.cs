using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.Business.Transactions;

public sealed record ComputedReward(
    TransactionRewardResult RewardResult,
    UserCardReward? BetterCard,
    decimal PotentialAmount,
    decimal MissedAmount,
    bool HasMissedReward);

public static class TransactionRewardCalculator
{
    public static ComputedReward? Compute(
        IReadOnlyList<UserCardReward> rewardProfile,
        int actingCardId,
        decimal amount,
        string? categoryCode)
    {
        var actingCard = rewardProfile.FirstOrDefault(c => c.Card.Id == actingCardId);
        if (actingCard is null) return null;

        var earnedRate = RateFor(actingCard, categoryCode);
        var earnedAmount = decimal.Round(amount * earnedRate / 100m, 2);
        var rewardResult = new TransactionRewardResult(earnedRate, earnedAmount, null, null);

        var bestOther = rewardProfile
            .Where(c => c.Card.Id != actingCardId)
            .Select(c => new { Card = c, Rate = RateFor(c, categoryCode) })
            .OrderByDescending(x => x.Rate)
            .FirstOrDefault();

        var hasMissedReward = bestOther is not null && bestOther.Rate > earnedRate;
        var potentialAmount = hasMissedReward ? decimal.Round(amount * bestOther!.Rate / 100m, 2) : earnedAmount;
        var missedAmount = hasMissedReward ? decimal.Round(potentialAmount - earnedAmount, 2) : 0m;

        return new ComputedReward(rewardResult, hasMissedReward ? bestOther!.Card : null, potentialAmount, missedAmount, hasMissedReward);
    }

    private static decimal RateFor(UserCardReward card, string? categoryCode)
    {
        if (categoryCode is not null && card.RatesByCategory.TryGetValue(categoryCode, out var rate))
            return rate;
        return card.BaseRate;
    }
}
