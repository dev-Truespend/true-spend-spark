using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

// Placeholder returning RapidAPI-shaped fixture data. Lets the sync flow run end-to-end
// without RewardsCC credentials in development. Two fictional cards cover both shapes
// (with and without spendBonusCategory entries) so downstream upserts exercise both
// branches.
public sealed class RewardsCcPlaceholderProvider : IRewardsCcProvider
{
    private static readonly RapidApiCardDetail SampleCard = new()
    {
        CardKey = "rcc-placeholder-sapphire-preferred",
        CardIssuer = "Chase",
        CardName = "Sapphire Preferred (placeholder)",
        CardNetwork = "Visa",
        CardType = "Personal",
        CardUrl = "https://example.com/sapphire-preferred",
        AnnualFee = 95m,
        FxFee = 0m,
        CreditRange = "Good to Excellent",
        BaseSpendAmount = 1m,
        BaseSpendEarnType = "Ultimate Rewards",
        BaseSpendEarnCurrency = "points",
        BaseSpendEarnValuation = 1.25m,
        IsActive = 1,
        SpendBonusCategory = new[]
        {
            new RapidApiSpendBonusCategory
            {
                SpendBonusCategoryName = "Dining",
                SpendBonusCategoryId = 1001,
                SpendBonusCategoryGroup = "Dining",
                SpendBonusSubcategoryGroup = "All Dining",
                SpendBonusDesc = "3X points on dining",
                EarnMultiplier = 3m
            },
            new RapidApiSpendBonusCategory
            {
                SpendBonusCategoryName = "Travel",
                SpendBonusCategoryId = 1002,
                SpendBonusCategoryGroup = "Travel",
                SpendBonusSubcategoryGroup = "All Travel",
                SpendBonusDesc = "2X points on travel",
                EarnMultiplier = 2m
            }
        }
    };

    public Task<IReadOnlyList<RapidApiSearchResult>> SearchCardByNameAsync(string cardName, CancellationToken cancellationToken)
    {
        IReadOnlyList<RapidApiSearchResult> result = new[]
        {
            new RapidApiSearchResult
            {
                CardKey = SampleCard.CardKey,
                CardIssuer = SampleCard.CardIssuer,
                CardName = SampleCard.CardName
            }
        };
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<RapidApiSearchResult>> ListAllCardsAsync(CancellationToken cancellationToken)
    {
        IReadOnlyList<RapidApiSearchResult> result = new[]
        {
            new RapidApiSearchResult
            {
                CardKey = SampleCard.CardKey,
                CardIssuer = SampleCard.CardIssuer,
                CardName = SampleCard.CardName
            }
        };
        return Task.FromResult(result);
    }

    public Task<RapidApiCardDetail?> GetCardDetailAsync(string cardKey, CancellationToken cancellationToken) =>
        Task.FromResult<RapidApiCardDetail?>(string.Equals(cardKey, SampleCard.CardKey, StringComparison.OrdinalIgnoreCase) ? SampleCard : null);
}
