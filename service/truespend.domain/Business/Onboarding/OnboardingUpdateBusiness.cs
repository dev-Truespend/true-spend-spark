using TrueSpend.Domain.BusinessInterfaces.Onboarding;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Onboarding;

public sealed class OnboardingUpdateBusiness(
    IOnboardingReadService readService,
    IOnboardingUpdateService updateService,
    OnboardingValidator validator) : IOnboardingUpdateBusiness
{
    public async Task<BusinessResponse<OnboardingResponse>> UpdateOnboardingAsync(
        OnboardingWorkflowUser user,
        UpdateOnboardingRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateUpdateOnboarding(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<OnboardingResponse>.Fail(errors, 400);
        }

        var current = await readService.GetOnboardingAsync(user, cancellationToken);
        var next = new OnboardingResponse(
            request.CurrentStepCode,
            request.CardConnectionPlaid,
            request.CardConnectionManual,
            request.CardConnectionSkipped,
            current.Completed);
        return BusinessResponse<OnboardingResponse>.Ok(await updateService.SaveOnboardingAsync(user, next, cancellationToken));
    }

    public async Task<BusinessResponse<OnboardingResponse>> SkipCardLinkingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var current = await readService.GetOnboardingAsync(user, cancellationToken);
        var next = current with { CurrentStepCode = OnboardingConstants.LocationPermissionStepCode, CardConnectionSkipped = true };
        return BusinessResponse<OnboardingResponse>.Ok(await updateService.SaveOnboardingAsync(user, next, cancellationToken));
    }

    public async Task<BusinessResponse<OnboardingResponse>> CompleteOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var current = await readService.GetOnboardingAsync(user, cancellationToken);
        var next = current with { CurrentStepCode = OnboardingConstants.CompleteStepCode, Completed = true };
        return BusinessResponse<OnboardingResponse>.Ok(await updateService.SaveOnboardingAsync(user, next, cancellationToken));
    }
}
