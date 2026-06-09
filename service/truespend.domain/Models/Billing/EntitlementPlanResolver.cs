using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Models.Billing;

// Workflow 13 § Trial Override Rule.
// Maps the current Stripe subscription state to the plan code the user should be entitled to.
//   trialing                                    -> subscription's picked plan (trial grants the chosen plan)
//   active                                      -> subscription's picked plan
//   past_due/unpaid within 24h of CurrentPeriodEnd -> subscription's picked plan (grace)
//   past_due/unpaid beyond grace, canceled, none   -> free (no active entitlement)
public static class EntitlementPlanResolver
{
    public static string Resolve(SubscriptionResponse subscription, DateTimeOffset now)
    {
        if (string.Equals(subscription.Status, BillingConstants.TrialingStatusCode, StringComparison.OrdinalIgnoreCase))
            return subscription.PlanCode;

        if (string.Equals(subscription.Status, BillingConstants.ActiveStatusCode, StringComparison.OrdinalIgnoreCase))
            return subscription.PlanCode;

        if (string.Equals(subscription.Status, BillingConstants.PastDueStatusCode, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(subscription.Status, BillingConstants.UnpaidStatusCode, StringComparison.OrdinalIgnoreCase))
        {
            var periodEnd = subscription.CurrentPeriodEnd;
            if (periodEnd.HasValue && now <= periodEnd.Value + BillingConstants.PastDueGraceWindow)
                return subscription.PlanCode;
        }

        return BillingConstants.FreePlanCode;
    }
}
