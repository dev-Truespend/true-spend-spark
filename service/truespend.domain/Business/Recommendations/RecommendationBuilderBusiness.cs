using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationBuilderBusiness(
    IRewardRulesReadService rewardRulesReadService,
    IRecommendationsInsertService recommendationsInsertService) : IRecommendationBuilderBusiness
{
    public Task<Recommendation?> BuildAsync(
        OnboardingWorkflowUser user,
        Merchant merchant,
        string categoryCode,
        decimal amount,
        CancellationToken cancellationToken) =>
        BuildAsync(user, merchant, categoryCode, amount, RecommendationsConstants.InStoreContextCode, cancellationToken);

    public async Task<Recommendation?> BuildAsync(
        OnboardingWorkflowUser user,
        Merchant merchant,
        string categoryCode,
        decimal amount,
        string contextCode,
        CancellationToken cancellationToken)
    {
        var profile = await rewardRulesReadService.GetUserRewardProfileAsync(user, cancellationToken);
        if (profile.Count == 0)
        {
            return null;
        }

        var ranked = profile
            .Select(entry =>
            {
                var rate = RateFor(entry, categoryCode);
                var rewardAmount = decimal.Round(amount * rate / 100m, 2);
                return new RecommendationCard(
                    entry.Card,
                    rate,
                    new Money(rewardAmount, entry.RewardCurrencyCode, FormatReward(rewardAmount, entry.RewardCurrencyCode)),
                    ReasonFor(entry, categoryCode, rate),
                    0);
            })
            .OrderByDescending(card => card.ExpectedRewardRate)
            .ThenBy(card => card.Card.IsPrimary ? 0 : 1)
            .Select((card, index) => card with { Rank = index + 1 })
            .ToArray();

        var recommendation = new Recommendation(
            0,
            merchant with { CategoryCode = categoryCode },
            categoryCode,
            ranked[0],
            $"{ranked[0].Card.DisplayName} is the best match for {Label(categoryCode)} right now.",
            ranked.Skip(1).Take(3).ToArray(),
            merchant.IsMultiCategory ? "Category coding can vary here. Pick the category that matches this purchase." : null);
        return await recommendationsInsertService.SaveRecommendationAsync(user, recommendation, contextCode, cancellationToken);
    }

    private static decimal RateFor(UserCardReward entry, string categoryCode) =>
        entry.RatesByCategory.TryGetValue(categoryCode, out var rate) ? rate : entry.BaseRate;

    private static string ReasonFor(UserCardReward entry, string categoryCode, decimal rate) =>
        entry.RatesByCategory.ContainsKey(categoryCode)
            ? $"{entry.Card.DisplayName} earns {rate:0.#}x on {Label(categoryCode)}."
            : $"{entry.Card.DisplayName} earns the base {rate:0.#}x rate.";

    private static string Label(string categoryCode) => categoryCode.Replace('_', ' ');

    private static string FormatReward(decimal amount, string currencyCode)
    {
        // cash_back-style currencies render as money; everything else (points, miles)
        // is a count, which is much easier to read without a leading symbol.
        return string.Equals(currencyCode, "cash_back", StringComparison.OrdinalIgnoreCase)
            ? $"${amount:0.00}"
            : $"{amount:0} {currencyCode}";
    }
}
