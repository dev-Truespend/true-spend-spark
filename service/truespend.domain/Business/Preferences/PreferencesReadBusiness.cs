using TrueSpend.Domain.BusinessInterfaces.Preferences;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Preferences;

namespace TrueSpend.Domain.Business.Preferences;

public sealed class PreferencesReadBusiness(IPreferencesReadService readService) : IPreferencesReadBusiness
{
    public async Task<BusinessResponse<PreferencesResponse>> GetPreferencesAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var preferences = await readService.GetPreferencesAsync(user, cancellationToken);
        return BusinessResponse<PreferencesResponse>.Ok(preferences);
    }
}
