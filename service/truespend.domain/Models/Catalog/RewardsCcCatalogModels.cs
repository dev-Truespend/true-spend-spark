namespace TrueSpend.Domain.Models.Catalog;

public sealed record RewardsCcIssuerData(
    string ProviderIssuerId,
    string Name,
    string? LogoUrl);

public sealed record RewardsCcCardProductData(
    string ProviderCardId,
    string ProviderIssuerId,
    string IssuerDisplayName,
    string Name,
    string Network,
    decimal? AnnualFee,
    string? CardArtUrl,
    string? TermsSummary,
    string? RewardCurrencyCode,
    string? RewardCurrencyName,
    decimal BaseRewardRate,
    string? CardType,
    string? CardUrl,
    decimal? FxFee,
    string? CreditRange,
    decimal? BaseRewardValuation,
    bool HasLoungeAccess,
    bool HasFreeCheckedBag,
    bool HasTrustedTravelerCredit,
    bool HasFreeHotelNight,
    string? SignupBonusJson,
    string? PerksJson,
    string? AnnualSpendRewardsJson);

public sealed record RewardsCcCategoryData(
    string ProviderCategoryId,
    string DisplayName,
    string CategoryGroup,
    string SubcategoryGroup);

public sealed record RewardsCcRewardRuleData(
    string ProviderCardId,
    string ProviderCategoryId,
    string CategoryDisplayName,
    string CategoryGroup,
    string SubcategoryGroup,
    decimal Multiplier,
    decimal? CapAmount,
    string? CapPeriodCode,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    bool RequiresActivation,
    bool IsMerchantLocked,
    string? MerchantBrand,
    string? Notes);

public sealed record CatalogSyncResult(
    int Processed,
    int Created,
    int Updated,
    int Deactivated,
    int Failed,
    int MappingReviewRequired = 0)
{
    public static CatalogSyncResult Empty => new(0, 0, 0, 0, 0, 0);
}

public sealed record CatalogReconcileBucket(int WouldCreate, int WouldUpdate, int WouldExpire);

public sealed record CatalogReconcileResult(
    CatalogReconcileBucket Issuers,
    CatalogReconcileBucket Products,
    CatalogReconcileBucket RewardRules,
    int MappingReviewRequired,
    bool AppliedChanges);

public sealed class RewardsCcSeedOptions
{
    public List<RewardsCcSeedEntry> Seed { get; set; } = new();
}

public sealed class RewardsCcSeedEntry
{
    public string Issuer { get; set; } = string.Empty;
    public List<string> Cards { get; set; } = new();
}
