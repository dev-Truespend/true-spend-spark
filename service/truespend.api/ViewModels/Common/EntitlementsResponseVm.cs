namespace TrueSpend.Api.ViewModels.Common;

public sealed record EntitlementsResponseVm(
    string PlanCode,
    bool Trialing,
    DateTimeOffset? TrialEndsAt,
    int? CardLinkLimit,
    bool UnlimitedCards,
    bool AiInsightsEnabled,
    bool PlaidLinkingEnabled,
    bool PlaidTransactionsViewEnabled,
    bool GeofencingEnabled,
    IReadOnlyDictionary<string, object>? Features);
