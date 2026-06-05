using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Billing;

public sealed class EntitlementGuard(IBillingReadBusiness billingRead) : IEntitlementGuard
{
    public async Task RequireFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken)
    {
        var response = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        var entitlements = response.Data
            ?? throw new EntitlementRequiredAppException(featureCode, BillingConstants.ProPlanCode, $"This feature requires an active subscription.");

        var enabled = featureCode switch
        {
            BillingConstants.AiInsightsEnabledFeatureCode => entitlements.AiInsightsEnabled,
            BillingConstants.PlaidLinkingEnabledFeatureCode => entitlements.PlaidLinkingEnabled,
            BillingConstants.PlaidTransactionsViewEnabledFeatureCode => entitlements.PlaidTransactionsViewEnabled,
            BillingConstants.GeofencingEnabledFeatureCode => entitlements.GeofencingEnabled,
            BillingConstants.UnlimitedCardsFeatureCode => entitlements.UnlimitedCards,
            _ => entitlements.Features.TryGetValue(featureCode, out var raw)
                 && raw.Equals("true", StringComparison.OrdinalIgnoreCase)
        };

        if (!enabled)
            throw new EntitlementRequiredAppException(featureCode, BillingConstants.ProPlanCode, $"This feature is available on Pro.");
    }

    public async Task RequireCardLinkCapacityAsync(OnboardingWorkflowUser user, int currentLinkedCards, CancellationToken cancellationToken)
    {
        var response = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        var entitlements = response.Data
            ?? throw new EntitlementRequiredAppException(BillingConstants.UnlimitedCardsFeatureCode, BillingConstants.ProPlanCode, "This feature requires an active subscription.");

        if (entitlements.UnlimitedCards) return;
        var limit = entitlements.CardLinkLimit;
        if (limit.HasValue && currentLinkedCards >= limit.Value)
            throw new EntitlementRequiredAppException(BillingConstants.UnlimitedCardsFeatureCode, BillingConstants.ProPlanCode,
                $"You've reached the {limit.Value}-card limit on the Basic plan. Upgrade to Pro for unlimited cards.");
    }
}
