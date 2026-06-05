using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;

namespace TrueSpend.Domain.BusinessInterfaces.Preferences;

public interface IPreferencesReadBusiness
{
    Task<BusinessResponse<PreferencesResponse>> GetPreferencesAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
