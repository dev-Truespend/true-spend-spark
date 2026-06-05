using TrueSpend.Domain.BusinessInterfaces.Preferences;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Preferences;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Preferences;

public sealed class PreferencesUpdateBusiness(
    IPreferencesUpdateService updateService,
    PreferencesValidator validator) : IPreferencesUpdateBusiness
{
    public async Task<BusinessResponse<PreferencesResponse>> UpdatePreferencesAsync(
        OnboardingWorkflowUser user,
        UpdatePreferencesRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateUpdatePreferences(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<PreferencesResponse>.Fail(errors, 400);
        }

        var preferences = await updateService.UpdatePreferencesAsync(user, request, cancellationToken);
        return BusinessResponse<PreferencesResponse>.Ok(preferences);
    }
}
