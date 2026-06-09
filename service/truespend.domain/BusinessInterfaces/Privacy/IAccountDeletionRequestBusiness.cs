using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Domain.BusinessInterfaces.Privacy;

// User-facing account-deletion lifecycle: request a deletion, cancel (reactivate) within the grace
// window, and read the current status. The actual purge runs later via AccountDeletionPurgeJob.
public interface IAccountDeletionRequestBusiness
{
    Task<BusinessResponse<AccountDeletionStatus>> GetStatusAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<AccountDeletionStatus>> RequestAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<AccountDeletionStatus>> CancelAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
