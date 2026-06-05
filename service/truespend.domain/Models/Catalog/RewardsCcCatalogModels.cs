namespace TrueSpend.Domain.Models.Catalog;

public sealed record RewardsCcIssuerData(
    string ProviderIssuerId,
    string Name,
    string? LogoUrl);

public sealed record RewardsCcCardProductData(
    string ProviderCardId,
    string ProviderIssuerId,
    string Name,
    string Network,
    decimal? AnnualFee,
    string? CardArtUrl,
    string? TermsSummary,
    string? RewardCurrencyCode,
    string? RewardCurrencyName,
    decimal BaseRewardRate);

public sealed record RewardsCcRewardRuleData(
    string ProviderCardId,
    string? CategoryCode,
    decimal Multiplier,
    decimal? CapAmount,
    string? CapPeriodCode,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    bool RequiresActivation,
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
