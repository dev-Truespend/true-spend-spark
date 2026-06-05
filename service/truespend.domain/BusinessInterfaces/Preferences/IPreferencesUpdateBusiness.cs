using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;

namespace TrueSpend.Domain.BusinessInterfaces.Preferences;

public interface IPreferencesUpdateBusiness
{
    Task<BusinessResponse<PreferencesResponse>> UpdatePreferencesAsync(OnboardingWorkflowUser user, UpdatePreferencesRequest request, CancellationToken cancellationToken);
}
