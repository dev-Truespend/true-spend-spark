using System.Globalization;
using System.Text.Json;
using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

// Translates a single RapidAPI card-detail payload into the internal sync shapes:
// the card itself, the distinct categories it touches, and one reward rule per
// spendBonusCategory entry. Pure mapping — no side-effects, no I/O.
public static class RewardsCcMapper
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public static RewardsCcMappedCard Map(RapidApiCardDetail detail)
    {
        var card = new RewardsCcCardProductData(
            ProviderCardId: detail.CardKey,
            ProviderIssuerId: SlugifyIssuer(detail.CardIssuer),
            IssuerDisplayName: detail.CardIssuer,
            Name: detail.CardName,
            Network: detail.CardNetwork ?? "Unknown",
            AnnualFee: detail.AnnualFee,
            CardArtUrl: null,
            TermsSummary: null,
            RewardCurrencyCode: detail.BaseSpendEarnCurrency,
            RewardCurrencyName: detail.BaseSpendEarnType,
            BaseRewardRate: detail.BaseSpendAmount ?? 1m,
            CardType: detail.CardType,
            CardUrl: detail.CardUrl,
            FxFee: detail.FxFee,
            CreditRange: detail.CreditRange,
            BaseRewardValuation: detail.BaseSpendEarnValuation,
            HasLoungeAccess: detail.IsLoungeAccess == 1,
            HasFreeCheckedBag: detail.IsFreeCheckedBag == 1,
            HasTrustedTravelerCredit: detail.IsTrustedTraveler == 1,
            HasFreeHotelNight: detail.IsFreeHotelNight == 1,
            SignupBonusJson: SerializeSignupBonus(detail),
            PerksJson: SerializeBenefits(detail.Benefit),
            AnnualSpendRewardsJson: SerializeAnnualSpend(detail.AnnualSpend));

        var categories = new List<RewardsCcCategoryData>();
        var rules = new List<RewardsCcRewardRuleData>();

        foreach (var entry in detail.SpendBonusCategory ?? Array.Empty<RapidApiSpendBonusCategory>())
        {
            // Skip malformed entries: a rule with no category or zero multiplier
            // can't drive a recommendation and would just pollute the table.
            if (entry.SpendBonusCategoryId == 0 || entry.EarnMultiplier <= 0) continue;

            var providerCategoryId = entry.SpendBonusCategoryId.ToString(CultureInfo.InvariantCulture);
            var categoryGroup = entry.SpendBonusCategoryGroup ?? "Other";
            var subcategoryGroup = entry.SpendBonusSubcategoryGroup ?? entry.SpendBonusCategoryName;
            // Brand-locked when the leaf name is a specific merchant rather than a generic category.
            // merchant_brand carries the leaf name to match against transaction merchant aliases.
            var isMerchantLocked = RewardsCcBrandDetection.IsMerchantLocked(entry.SpendBonusCategoryName);

            categories.Add(new RewardsCcCategoryData(
                ProviderCategoryId: providerCategoryId,
                DisplayName: entry.SpendBonusCategoryName,
                CategoryGroup: categoryGroup,
                SubcategoryGroup: subcategoryGroup));

            rules.Add(new RewardsCcRewardRuleData(
                ProviderCardId: detail.CardKey,
                ProviderCategoryId: providerCategoryId,
                CategoryDisplayName: entry.SpendBonusCategoryName,
                CategoryGroup: categoryGroup,
                SubcategoryGroup: subcategoryGroup,
                Multiplier: entry.EarnMultiplier,
                CapAmount: entry.IsSpendLimit == 1 ? entry.SpendLimit : null,
                CapPeriodCode: entry.IsSpendLimit == 1 ? entry.SpendLimitResetPeriod : null,
                EffectiveFrom: entry.IsDateLimit == 1 ? TryParseDate(entry.LimitBeginDate) : null,
                EffectiveTo: entry.IsDateLimit == 1 ? TryParseDate(entry.LimitEndDate) : null,
                RequiresActivation: false,
                IsMerchantLocked: isMerchantLocked,
                MerchantBrand: isMerchantLocked ? entry.SpendBonusCategoryName : null,
                Notes: entry.SpendBonusDesc));
        }

        return new RewardsCcMappedCard(card, categories, rules);
    }

    private static string SlugifyIssuer(string issuer)
    {
        if (string.IsNullOrWhiteSpace(issuer)) return "unknown";
        return issuer.Trim().ToLowerInvariant()
            .Replace(' ', '-')
            .Replace("&", "and")
            .Replace("'", string.Empty);
    }

    private static string? SerializeSignupBonus(RapidApiCardDetail detail)
    {
        if (detail.IsSignupBonus != 1) return null;
        var payload = new
        {
            amount = detail.SignupBonusAmount,
            type = detail.SignupBonusType,
            category = detail.SignupBonusCategory,
            item = detail.SignupBonusItem,
            spend = detail.SignupBonusSpend,
            length = detail.SignupBonusLength,
            period = detail.SignupBonusLengthPeriod,
            description = detail.SignupBonusDesc
        };
        return JsonSerializer.Serialize(payload, JsonOpts);
    }

    private static string? SerializeBenefits(IReadOnlyList<RapidApiBenefit>? benefits)
    {
        if (benefits is null || benefits.Count == 0) return null;
        var payload = benefits.Select(b => new { title = b.BenefitTitle, description = b.BenefitDesc }).ToArray();
        return JsonSerializer.Serialize(payload, JsonOpts);
    }

    private static string? SerializeAnnualSpend(IReadOnlyList<RapidApiAnnualSpend>? annualSpend)
    {
        if (annualSpend is null || annualSpend.Count == 0) return null;
        var payload = annualSpend.Select(a => new { description = a.AnnualSpendDesc }).ToArray();
        return JsonSerializer.Serialize(payload, JsonOpts);
    }

    private static DateOnly? TryParseDate(string? value) =>
        DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) ? parsed : null;
}

public sealed record RewardsCcMappedCard(
    RewardsCcCardProductData Card,
    IReadOnlyList<RewardsCcCategoryData> Categories,
    IReadOnlyList<RewardsCcRewardRuleData> Rules);
