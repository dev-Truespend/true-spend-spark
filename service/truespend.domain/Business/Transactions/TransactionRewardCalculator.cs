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
        string? categoryCode,
        string? merchantName = null)
    {
        var actingCard = rewardProfile.FirstOrDefault(c => c.Card.Id == actingCardId);
        if (actingCard is null) return null;

        var earnedRate = RateFor(actingCard, categoryCode, merchantName);
        var earnedAmount = decimal.Round(amount * earnedRate / 100m, 2);
        var rewardResult = new TransactionRewardResult(earnedRate, earnedAmount, null, null);

        var bestOther = rewardProfile
            .Where(c => c.Card.Id != actingCardId)
            .Select(c => new { Card = c, Rate = RateFor(c, categoryCode, merchantName) })
            .OrderByDescending(x => x.Rate)
            .FirstOrDefault();

        var hasMissedReward = bestOther is not null && bestOther.Rate > earnedRate;
        var potentialAmount = hasMissedReward ? decimal.Round(amount * bestOther!.Rate / 100m, 2) : earnedAmount;
        var missedAmount = hasMissedReward ? decimal.Round(potentialAmount - earnedAmount, 2) : 0m;

        return new ComputedReward(rewardResult, hasMissedReward ? bestOther!.Card : null, potentialAmount, missedAmount, hasMissedReward);
    }

    // Effective rate for a card on this transaction: the best of the generic category rate and any
    // merchant-locked bonus whose brand matches the transaction's merchant. A locked rule with no
    // merchant match never counts, so it can't inflate earned or missed.
    private static decimal RateFor(UserCardReward card, string? categoryCode, string? merchantName)
    {
        if (categoryCode is null) return card.BaseRate;

        var generic = card.RatesByCategory.TryGetValue(categoryCode, out var rate) ? rate : card.BaseRate;

        var lockedMatch = card.MerchantLockedRates
            .Where(l => string.Equals(l.CategoryCode, categoryCode, StringComparison.OrdinalIgnoreCase)
                        && MerchantBrandMatcher.Matches(l.MerchantBrand, merchantName))
            .Select(l => l.Rate)
            .DefaultIfEmpty(0m)
            .Max();

        return Math.Max(generic, lockedMatch);
    }
}
