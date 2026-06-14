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
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationBuilderBusiness(
    IRewardRulesReadService rewardRulesReadService,
    ICatalogReadService catalogReadService,
    IMerchantsReadService merchantsReadService,
    IRecommendationsInsertService recommendationsInsertService) : IRecommendationBuilderBusiness
{
    private const string CashBackCurrencyCode = "cash_back";
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

        // Resolve the human label for the category (catalog.categories.display_name). The reward category
        // code is an opaque RewardsCC id (e.g. rcc_1455345350), so it must never reach user-facing text.
        var categories = await catalogReadService.GetCategoriesAsync(cancellationToken);
        var categoryLabel = categories
            .FirstOrDefault(c => string.Equals(c.Code, categoryCode, StringComparison.OrdinalIgnoreCase))?.DisplayName
            ?? "this category";

        var ranked = profile
            .Select(entry =>
            {
                var rate = RateFor(entry, categoryCode);
                var rewardAmount = RewardAmount(amount, rate, entry.RewardCurrencyCode);
                return new RecommendationCard(
                    entry.Card,
                    rate,
                    new Money(rewardAmount, entry.RewardCurrencyCode, FormatReward(rewardAmount, entry.RewardCurrencyCode)),
                    ReasonFor(entry, categoryCode, categoryLabel, rate),
                    0);
            })
            .OrderByDescending(card => card.ExpectedRewardRate)
            .ThenBy(card => card.Card.IsPrimary ? 0 : 1)
            .Select((card, index) => card with { Rank = index + 1 })
            .ToArray();

        // For a multi-category merchant, attach the categories it actually spans so the picker offers just
        // those (e.g. Walmart -> grocery / general merchandise / pharmacy) instead of the whole taxonomy.
        IReadOnlyList<Category> categoryOptions = merchant.IsMultiCategory
            ? await merchantsReadService.GetSpanningCategoriesAsync(merchant.Name, cancellationToken) ?? []
            : [];

        var recommendation = new Recommendation(
            0,
            merchant with { CategoryCode = categoryCode, CategoryOptions = categoryOptions },
            categoryCode,
            ranked[0],
            $"{ranked[0].Card.DisplayName} is the best match for {categoryLabel} right now.",
            ranked.Skip(1).Take(3).ToArray(),
            merchant.IsMultiCategory ? "Category coding can vary here. Pick the category that matches this purchase." : null);
        return await recommendationsInsertService.SaveRecommendationAsync(user, recommendation, contextCode, cancellationToken);
    }

    private static decimal RateFor(UserCardReward entry, string categoryCode) =>
        entry.RatesByCategory.TryGetValue(categoryCode, out var rate) ? rate : entry.BaseRate;

    // Cash-back rates are percentages (3 => 3% of spend); points/miles rates are multipliers
    // (3 => 3x points per dollar). Dividing by 100 for points produced the "0 points" bug.
    private static decimal RewardAmount(decimal amount, decimal rate, string currencyCode) =>
        IsCashBack(currencyCode)
            ? decimal.Round(amount * rate / 100m, 2)
            : decimal.Round(amount * rate, 0);

    private static string ReasonFor(UserCardReward entry, string categoryCode, string categoryLabel, decimal rate) =>
        entry.RatesByCategory.ContainsKey(categoryCode)
            ? $"{entry.Card.DisplayName} earns {rate:0.#}x on {categoryLabel}."
            : $"{entry.Card.DisplayName} earns the base {rate:0.#}x rate.";

    private static bool IsCashBack(string currencyCode) =>
        string.Equals(currencyCode, CashBackCurrencyCode, StringComparison.OrdinalIgnoreCase);

    private static string FormatReward(decimal amount, string currencyCode)
    {
        // cash_back-style currencies render as money; everything else (points, miles)
        // is a count, which is much easier to read without a leading symbol.
        return IsCashBack(currencyCode)
            ? $"${amount:0.00}"
            : $"{amount:0} {currencyCode}";
    }
}
