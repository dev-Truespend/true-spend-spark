using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;

namespace TrueSpend.Domain.ServiceInterfaces.Preferences;

public interface IPreferencesReadService
{
    Task<PreferencesResponse> GetPreferencesAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
