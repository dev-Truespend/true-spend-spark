using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Billing;

// Pro-only daily quota for user-initiated Plaid re-sync. Automatic nightly sync is unaffected.
public interface IManualResyncQuotaBusiness
{
    Task<BusinessResponse<ManualResyncQuotaStatus>> GetStatusAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);

    // Enforces the Pro gate (throws EntitlementRequiredAppException for non-Pro) and consumes one unit
    // of today's quota. Returns Allowed=false when the daily limit is already reached.
    Task<ManualResyncConsumeResult> TryConsumeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
