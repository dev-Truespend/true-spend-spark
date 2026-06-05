using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;

namespace TrueSpend.Domain.ServiceInterfaces.Preferences;

public interface IPreferencesUpdateService
{
    Task<PreferencesResponse> UpdatePreferencesAsync(OnboardingWorkflowUser user, UpdatePreferencesRequest request, CancellationToken cancellationToken);
}
