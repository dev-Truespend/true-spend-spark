using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class RewardsCcPlaceholderProvider : IRewardsCcProvider
{
    private static readonly RewardsCcIssuerData[] Issuers =
    {
        new("rcc-issuer-chase", "Chase", null),
        new("rcc-issuer-amex", "American Express", null),
        new("rcc-issuer-capital-one", "Capital One", null),
        new("rcc-issuer-citi", "Citi", null),
        new("rcc-issuer-discover", "Discover", null),
    };

    private static readonly RewardsCcCardProductData[] CardProducts =
    {
        new("rcc-card-chase-freedom-flex", "rcc-issuer-chase", "Freedom Flex", "Mastercard", 0m, null,
            "5x rotating quarterly categories, 3x dining, 1x other.", "points", "Ultimate Rewards", 1.0m),
        new("rcc-card-chase-sapphire-preferred", "rcc-issuer-chase", "Sapphire Preferred", "Visa", 95m, null,
            "3x dining, 2x travel, 1x other.", "points", "Ultimate Rewards", 1.0m),
        new("rcc-card-amex-blue-cash-preferred", "rcc-issuer-amex", "Blue Cash Preferred", "American Express", 95m, null,
            "6% grocery (up to $6,000/yr), 3% transit, 1% other.", "cashback", "USD", 1.0m),
        new("rcc-card-capital-one-savor", "rcc-issuer-capital-one", "Savor", "Mastercard", 95m, null,
            "4% dining/entertainment, 2% grocery, 1% other.", "cashback", "USD", 1.0m),
        new("rcc-card-citi-double-cash", "rcc-issuer-citi", "Double Cash", "Mastercard", 0m, null,
            "2% on everything (1% buy + 1% pay).", "cashback", "USD", 2.0m),
        new("rcc-card-discover-it-cashback", "rcc-issuer-discover", "It Cash Back", "Discover", 0m, null,
            "5% rotating categories (up to $1,500/quarter), 1% other.", "cashback", "USD", 1.0m),
    };

    private static readonly Dictionary<string, RewardsCcRewardRuleData[]> RewardRules = new()
    {
        ["rcc-card-chase-freedom-flex"] = new[]
        {
            new RewardsCcRewardRuleData("rcc-card-chase-freedom-flex", "grocery", 5m, 1500m, "quarterly", null, null, true, "Rotating quarterly category"),
            new RewardsCcRewardRuleData("rcc-card-chase-freedom-flex", "dining", 3m, null, null, null, null, false, null),
            new RewardsCcRewardRuleData("rcc-card-chase-freedom-flex", null, 1m, null, null, null, null, false, "Base rate"),
        },
        ["rcc-card-amex-blue-cash-preferred"] = new[]
        {
            new RewardsCcRewardRuleData("rcc-card-amex-blue-cash-preferred", "grocery", 6m, 6000m, "yearly", null, null, false, null),
            new RewardsCcRewardRuleData("rcc-card-amex-blue-cash-preferred", "transit", 3m, null, null, null, null, false, null),
            new RewardsCcRewardRuleData("rcc-card-amex-blue-cash-preferred", null, 1m, null, null, null, null, false, "Base rate"),
        },
        ["rcc-card-citi-double-cash"] = new[]
        {
            new RewardsCcRewardRuleData("rcc-card-citi-double-cash", null, 2m, null, null, null, null, false, "Flat 2% everywhere"),
        },
    };

    public Task<IReadOnlyList<RewardsCcIssuerData>> GetIssuersAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<RewardsCcIssuerData>>(Issuers);

    public Task<IReadOnlyList<RewardsCcCardProductData>> GetCardProductsAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<RewardsCcCardProductData>>(CardProducts);

    public Task<IReadOnlyList<RewardsCcRewardRuleData>> GetRewardRulesAsync(string providerCardId, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<RewardsCcRewardRuleData>>(
            RewardRules.TryGetValue(providerCardId, out var rules) ? rules : Array.Empty<RewardsCcRewardRuleData>());
}
