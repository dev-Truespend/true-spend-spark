using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Billing;

public sealed class EntitlementGuard(IBillingReadBusiness billingRead) : IEntitlementGuard
{
    public async Task RequireFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken)
    {
        var response = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        var entitlements = response.Data
            ?? throw new EntitlementRequiredAppException(featureCode, BillingConstants.ProPlanCode, $"This feature requires an active subscription.");

        if (!IsFeatureEnabled(entitlements, featureCode))
        {
            var requiredPlan = MinimumPlanForFeature(featureCode);
            throw new EntitlementRequiredAppException(featureCode, requiredPlan,
                $"This feature is available on {DisplayName(requiredPlan)}.");
        }
    }

    public async Task<bool> HasFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken)
    {
        var response = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        return response.Data is { } entitlements && IsFeatureEnabled(entitlements, featureCode);
    }

    public async Task RequireCardLinkCapacityAsync(OnboardingWorkflowUser user, string cardSource, int currentSourceCount, CancellationToken cancellationToken)
    {
        var response = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        var entitlements = response.Data
            ?? throw new EntitlementRequiredAppException(BillingConstants.UnlimitedCardsFeatureCode, BillingConstants.ProPlanCode, "This feature requires an active subscription.");

        if (entitlements.UnlimitedCards) return;

        var isPlaid = string.Equals(cardSource, "plaid", StringComparison.OrdinalIgnoreCase);
        var limit = isPlaid ? entitlements.PlaidCardLimit : entitlements.ManualCardLimit;
        if (!limit.HasValue || currentSourceCount < limit.Value) return;

        var featureCode = isPlaid ? BillingConstants.PlaidCardLimitFeatureCode : BillingConstants.ManualCardLimitFeatureCode;
        var sourceLabel = isPlaid ? "bank-linked" : "manual";
        var requiredPlan = entitlements.PlanCode == BillingConstants.FreePlanCode
            ? BillingConstants.BasicPlanCode
            : BillingConstants.ProPlanCode;
        throw new EntitlementRequiredAppException(featureCode, requiredPlan,
            $"You've reached the {limit.Value}-{sourceLabel}-card limit on your plan. Upgrade to {DisplayName(requiredPlan)} for more cards.");
    }

    private static bool IsFeatureEnabled(EntitlementsResponse entitlements, string featureCode) => featureCode switch
    {
        BillingConstants.AiInsightsEnabledFeatureCode => entitlements.AiInsightsEnabled,
        BillingConstants.PlaidLinkingEnabledFeatureCode => entitlements.PlaidLinkingEnabled,
        BillingConstants.PlaidTransactionsViewEnabledFeatureCode => entitlements.PlaidTransactionsViewEnabled,
        BillingConstants.GeofencingEnabledFeatureCode => entitlements.GeofencingEnabled,
        BillingConstants.UnlimitedCardsFeatureCode => entitlements.UnlimitedCards,
        // Pro-only feature backed directly by plan (no billing.plan_features row).
        BillingConstants.ManualResyncEnabledFeatureCode => entitlements.PlanCode == BillingConstants.ProPlanCode,
        _ => entitlements.Features.TryGetValue(featureCode, out var raw)
             && raw.Equals("true", StringComparison.OrdinalIgnoreCase)
    };

    // The cheapest plan that unlocks the feature, used only to pre-select an upgrade target in the
    // UI. Mirrors billing.plan_features; the on/off decision above stays data-driven via entitlements.
    private static string MinimumPlanForFeature(string featureCode) => featureCode switch
    {
        BillingConstants.PlaidLinkingEnabledFeatureCode => BillingConstants.BasicPlanCode,
        BillingConstants.PlaidTransactionsViewEnabledFeatureCode => BillingConstants.BasicPlanCode,
        BillingConstants.MapPinsEnabledFeatureCode => BillingConstants.BasicPlanCode,
        _ => BillingConstants.ProPlanCode
    };

    private static string DisplayName(string planCode) => planCode switch
    {
        BillingConstants.BasicPlanCode => "Basic",
        BillingConstants.ProPlanCode => "Pro",
        _ => planCode
    };
}
