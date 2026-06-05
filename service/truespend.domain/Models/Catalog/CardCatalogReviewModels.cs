namespace TrueSpend.Domain.Models.Catalog;

public sealed record CardCatalogReviewResult(
    int ReviewItemsCreated,
    int AutoResolved)
{
    public static CardCatalogReviewResult Empty => new(0, 0);
}

public static class CardCatalogReviewReasonCodes
{
    public const string LowConfidenceProductMatch = "LOW_CONFIDENCE_PRODUCT_MATCH";
    public const string MissingIssuerMapping = "MISSING_ISSUER_MAPPING";
    public const string MissingNetworkMapping = "MISSING_NETWORK_MAPPING";
    public const string MissingRewardCurrencyMapping = "MISSING_REWARD_CURRENCY_MAPPING";
}
