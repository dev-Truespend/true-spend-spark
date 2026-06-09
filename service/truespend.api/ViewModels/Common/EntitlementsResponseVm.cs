namespace TrueSpend.Api.ViewModels.Common;

public sealed record EntitlementsResponseVm(
    string PlanCode,
    bool Trialing,
    DateTimeOffset? TrialEndsAt,
    int? ManualCardLimit,
    int? PlaidCardLimit,
    int? GeoRecommendationsPerDay,
    bool UnlimitedCards,
    bool AiInsightsEnabled,
    bool PlaidLinkingEnabled,
    bool PlaidTransactionsViewEnabled,
    bool GeofencingEnabled,
    IReadOnlyDictionary<string, object>? Features);
