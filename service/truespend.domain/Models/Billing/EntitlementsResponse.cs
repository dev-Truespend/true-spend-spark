namespace TrueSpend.Domain.Models.Billing;

public sealed record EntitlementsResponse(
    string PlanCode,
    bool Trialing,
    DateTimeOffset? TrialEndsAt,
    int? CardLinkLimit,
    bool UnlimitedCards,
    bool AiInsightsEnabled,
    bool PlaidLinkingEnabled,
    bool PlaidTransactionsViewEnabled,
    bool GeofencingEnabled,
    IReadOnlyDictionary<string, string> Features);
