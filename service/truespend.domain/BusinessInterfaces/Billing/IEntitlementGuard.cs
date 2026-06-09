using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IEntitlementGuard
{
    Task RequireFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken);

    // Non-throwing entitlement check. Use in batch/worker flows that should skip non-entitled users
    // quietly rather than throw (e.g. nightly jobs iterating many users).
    Task<bool> HasFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken);

    // cardSource is "manual" or "plaid" (see lookup.card_sources); the limit enforced is the
    // matching per-source entitlement. currentSourceCount is the active card count for that source.
    Task RequireCardLinkCapacityAsync(OnboardingWorkflowUser user, string cardSource, int currentSourceCount, CancellationToken cancellationToken);
}
