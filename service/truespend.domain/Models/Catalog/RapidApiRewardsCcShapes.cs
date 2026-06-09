using System.Text.Json.Serialization;

namespace TrueSpend.Domain.Models.Catalog;

// Raw RapidAPI shapes for the rewards-credit-card-api endpoints.
// camelCase JSON deserialization via JsonPropertyName attributes; only the
// fields the catalog sync actually consumes are modeled here.

public sealed record RapidApiSearchResult
{
    [JsonPropertyName("cardKey")] public string CardKey { get; init; } = string.Empty;
    [JsonPropertyName("cardIssuer")] public string CardIssuer { get; init; } = string.Empty;
    [JsonPropertyName("cardName")] public string CardName { get; init; } = string.Empty;
}

public sealed record RapidApiCardDetail
{
    [JsonPropertyName("cardKey")] public string CardKey { get; init; } = string.Empty;
    [JsonPropertyName("cardIssuer")] public string CardIssuer { get; init; } = string.Empty;
    [JsonPropertyName("cardName")] public string CardName { get; init; } = string.Empty;
    [JsonPropertyName("cardNetwork")] public string? CardNetwork { get; init; }
    [JsonPropertyName("cardType")] public string? CardType { get; init; }
    [JsonPropertyName("cardUrl")] public string? CardUrl { get; init; }
    [JsonPropertyName("annualFee")] public decimal? AnnualFee { get; init; }
    [JsonPropertyName("fxFee")] public decimal? FxFee { get; init; }
    [JsonPropertyName("creditRange")] public string? CreditRange { get; init; }
    [JsonPropertyName("baseSpendAmount")] public decimal? BaseSpendAmount { get; init; }
    [JsonPropertyName("baseSpendEarnType")] public string? BaseSpendEarnType { get; init; }
    [JsonPropertyName("baseSpendEarnCurrency")] public string? BaseSpendEarnCurrency { get; init; }
    [JsonPropertyName("baseSpendEarnValuation")] public decimal? BaseSpendEarnValuation { get; init; }
    [JsonPropertyName("isLoungeAccess")] public int IsLoungeAccess { get; init; }
    [JsonPropertyName("isFreeCheckedBag")] public int IsFreeCheckedBag { get; init; }
    [JsonPropertyName("isTrustedTraveler")] public int IsTrustedTraveler { get; init; }
    [JsonPropertyName("isFreeHotelNight")] public int IsFreeHotelNight { get; init; }
    [JsonPropertyName("isActive")] public int IsActive { get; init; }
    [JsonPropertyName("isSignupBonus")] public int IsSignupBonus { get; init; }
    [JsonPropertyName("signupBonusAmount")] public string? SignupBonusAmount { get; init; }
    [JsonPropertyName("signupBonusType")] public string? SignupBonusType { get; init; }
    [JsonPropertyName("signupBonusCategory")] public string? SignupBonusCategory { get; init; }
    [JsonPropertyName("signUpBonusItem")] public string? SignupBonusItem { get; init; }
    [JsonPropertyName("signupBonusSpend")] public decimal? SignupBonusSpend { get; init; }
    [JsonPropertyName("signupBonusLength")] public int? SignupBonusLength { get; init; }
    [JsonPropertyName("signupBonusLengthPeriod")] public string? SignupBonusLengthPeriod { get; init; }
    [JsonPropertyName("signupBonusDesc")] public string? SignupBonusDesc { get; init; }
    [JsonPropertyName("benefit")] public IReadOnlyList<RapidApiBenefit>? Benefit { get; init; }
    [JsonPropertyName("spendBonusCategory")] public IReadOnlyList<RapidApiSpendBonusCategory>? SpendBonusCategory { get; init; }
    [JsonPropertyName("annualSpend")] public IReadOnlyList<RapidApiAnnualSpend>? AnnualSpend { get; init; }
}

public sealed record RapidApiBenefit
{
    [JsonPropertyName("benefitTitle")] public string BenefitTitle { get; init; } = string.Empty;
    [JsonPropertyName("benefitDesc")] public string? BenefitDesc { get; init; }
}

public sealed record RapidApiSpendBonusCategory
{
    [JsonPropertyName("spendBonusCategoryType")] public string? SpendBonusCategoryType { get; init; }
    [JsonPropertyName("spendBonusCategoryName")] public string SpendBonusCategoryName { get; init; } = string.Empty;
    [JsonPropertyName("spendBonusCategoryId")] public long SpendBonusCategoryId { get; init; }
    [JsonPropertyName("spendBonusCategoryGroup")] public string? SpendBonusCategoryGroup { get; init; }
    [JsonPropertyName("spendBonusSubcategoryGroup")] public string? SpendBonusSubcategoryGroup { get; init; }
    [JsonPropertyName("spendBonusDesc")] public string? SpendBonusDesc { get; init; }
    [JsonPropertyName("earnMultiplier")] public decimal EarnMultiplier { get; init; }
    [JsonPropertyName("isDateLimit")] public int IsDateLimit { get; init; }
    [JsonPropertyName("limitBeginDate")] public string? LimitBeginDate { get; init; }
    [JsonPropertyName("limitEndDate")] public string? LimitEndDate { get; init; }
    [JsonPropertyName("isSpendLimit")] public int IsSpendLimit { get; init; }
    [JsonPropertyName("spendLimit")] public decimal? SpendLimit { get; init; }
    [JsonPropertyName("spendLimitResetPeriod")] public string? SpendLimitResetPeriod { get; init; }
}

public sealed record RapidApiAnnualSpend
{
    [JsonPropertyName("annualSpendDesc")] public string? AnnualSpendDesc { get; init; }
}
