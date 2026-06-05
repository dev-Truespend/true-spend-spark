using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IEntitlementGuard
{
    Task RequireFeatureAsync(OnboardingWorkflowUser user, string featureCode, CancellationToken cancellationToken);
    Task RequireCardLinkCapacityAsync(OnboardingWorkflowUser user, int currentLinkedCards, CancellationToken cancellationToken);
}
