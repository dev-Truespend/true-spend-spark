using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;

namespace TrueSpend.Domain.ServiceInterfaces.Profile;

public interface IProfileReadService
{
    Task<ProfileResponse> GetProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
