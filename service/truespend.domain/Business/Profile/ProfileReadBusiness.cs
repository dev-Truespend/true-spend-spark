using TrueSpend.Domain.BusinessInterfaces.Profile;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.ServiceInterfaces.Profile;

namespace TrueSpend.Domain.Business.Profile;

public sealed class ProfileReadBusiness(IProfileReadService readService) : IProfileReadBusiness
{
    public async Task<BusinessResponse<ProfileResponse>> GetProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var profile = await readService.GetProfileAsync(user, cancellationToken);
        return BusinessResponse<ProfileResponse>.Ok(profile);
    }
}
