using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;

namespace TrueSpend.Domain.BusinessInterfaces.Profile;

public interface IProfileUpdateBusiness
{
    Task<BusinessResponse<ProfileResponse>> UpdateProfileAsync(OnboardingWorkflowUser user, UpdateProfileRequest request, CancellationToken cancellationToken);

    Task<BusinessResponse<ProfileResponse>> UploadAvatarAsync(OnboardingWorkflowUser user, UploadAvatarRequest request, CancellationToken cancellationToken);
}
