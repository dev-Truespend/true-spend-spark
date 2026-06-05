using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Cards;

public static class CardLimitsCalculator
{
    public static CardLimitsResponse Calculate(IReadOnlyList<CardSummary> cards, string planCode)
    {
        var plaid = cards.Count(c => c.Source == "plaid");
        var manual = cards.Count(c => c.Source == "manual");
        return planCode == BillingConstants.ProPlanCode
            ? new CardLimitsResponse(plaid, null, manual, null, true)
            : new CardLimitsResponse(plaid, CardsConstants.BasicPlanCardLimit, manual, CardsConstants.BasicPlanCardLimit, false);
    }
}
