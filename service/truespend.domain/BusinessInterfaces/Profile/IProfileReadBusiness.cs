using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;

namespace TrueSpend.Domain.BusinessInterfaces.Profile;

public interface IProfileReadBusiness
{
    Task<BusinessResponse<ProfileResponse>> GetProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
