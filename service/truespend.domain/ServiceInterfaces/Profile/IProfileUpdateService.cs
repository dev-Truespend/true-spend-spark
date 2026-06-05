using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;

namespace TrueSpend.Domain.ServiceInterfaces.Profile;

public interface IProfileUpdateService
{
    Task<ProfileResponse> UpdateProfileAsync(OnboardingWorkflowUser user, UpdateProfileRequest request, CancellationToken cancellationToken);

    Task<ProfileResponse> UpdateAvatarUrlAsync(OnboardingWorkflowUser user, string avatarUrl, CancellationToken cancellationToken);
}
