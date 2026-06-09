using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Business.Cards;

public static class CardLimitsCalculator
{
    // Per-source limits come from the resolved entitlements (billing.plan_features), so the
    // displayed limits match exactly what RequireCardLinkCapacityAsync enforces. When the plan
    // grants unlimited cards, both per-source limits are already null on the entitlements.
    public static CardLimitsResponse Calculate(IReadOnlyList<CardSummary> cards, EntitlementsResponse entitlements)
    {
        var plaid = cards.Count(c => c.Source == "plaid");
        var manual = cards.Count(c => c.Source == "manual");
        return new CardLimitsResponse(
            plaid,
            entitlements.PlaidCardLimit,
            manual,
            entitlements.ManualCardLimit,
            entitlements.UnlimitedCards);
    }
}
