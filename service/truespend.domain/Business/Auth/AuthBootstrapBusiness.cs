using TrueSpend.Domain.BusinessInterfaces.Auth;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Auth;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Auth;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Auth;

public sealed class AuthBootstrapBusiness(
    IAuthBootstrapService authBootstrapService,
    IBillingReadService billingReadService,
    AuthBootstrapValidator validator) : IAuthBootstrapBusiness
{
    public async Task<BusinessResponse<AuthBootstrapResult>> BootstrapAsync(
        AuthBootstrapInput input,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(input);
        if (errors.Count > 0)
        {
            return BusinessResponse<AuthBootstrapResult>.Fail(errors, 400);
        }

        var profile = await EnsureProfileAsync(input, cancellationToken);
        var preferences = await EnsurePreferencesAsync(input, cancellationToken);
        var permissions = await EnsurePermissionsAsync(input.UserId, cancellationToken);
        var onboarding = await EnsureOnboardingAsync(input.UserId, cancellationToken);
        var stepCode = await authBootstrapService.GetOnboardingStepCodeAsync(onboarding.CurrentStepId, cancellationToken)
                       ?? OnboardingConstants.CardConnectionStepCode;

        int? deviceId = input.Device is { } device
            ? await authBootstrapService.UpsertDeviceAsync(input.UserId, device, cancellationToken)
            : null;

        var roles = await authBootstrapService.GetRoleCodesAsync(input.UserId, cancellationToken);

        var workflowUser = new OnboardingWorkflowUser(input.UserId, input.Email);
        var entitlements = await billingReadService.GetEntitlementsAsync(workflowUser, cancellationToken);

        var result = new AuthBootstrapResult(
            profile with { CountryCode = input.CountryCode, CurrentPlanCode = entitlements.PlanCode },
            preferences,
            permissions with { Device = input.Device },
            new OnboardingResult(stepCode, onboarding.CardConnectionPlaid, onboarding.CardConnectionManual, onboarding.CardConnectionSkipped, onboarding.Completed),
            new EntitlementsResult(
                entitlements.PlanCode,
                entitlements.Features.ToDictionary(kv => kv.Key, kv => (object)kv.Value)),
            roles,
            deviceId);

        return BusinessResponse<AuthBootstrapResult>.Ok(result);
    }

    private async Task<ProfileResult> EnsureProfileAsync(AuthBootstrapInput input, CancellationToken cancellationToken)
    {
        var existing = await authBootstrapService.FindProfileAsync(input.UserId, cancellationToken);
        if (existing is not null) return existing;

        var displayName = input.DisplayName ?? input.Email ?? "TrueSpend user";
        var email = input.Email ?? "";
        return await authBootstrapService.InsertProfileAsync(input.UserId, displayName, email, cancellationToken);
    }

    private async Task<PreferencesResult> EnsurePreferencesAsync(AuthBootstrapInput input, CancellationToken cancellationToken)
    {
        var existing = await authBootstrapService.FindPreferencesAsync(input.UserId, cancellationToken);
        if (existing is not null) return existing;

        var locale = input.Locale ?? AppConstants.DefaultLocale;
        var timezone = input.Timezone ?? AppConstants.DefaultTimezone;
        return await authBootstrapService.InsertDefaultPreferencesAsync(input.UserId, locale, timezone, cancellationToken);
    }

    private async Task<PermissionsResult> EnsurePermissionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var existing = await authBootstrapService.FindPermissionsAsync(userId, cancellationToken);
        if (existing is not null) return existing;
        return await authBootstrapService.InsertDefaultPermissionsAsync(userId, cancellationToken);
    }

    private async Task<OnboardingStateSnapshot> EnsureOnboardingAsync(Guid userId, CancellationToken cancellationToken)
    {
        var existing = await authBootstrapService.FindOnboardingAsync(userId, cancellationToken);
        if (existing is not null) return existing;
        return await authBootstrapService.InsertDefaultOnboardingAsync(userId, cancellationToken);
    }
}
