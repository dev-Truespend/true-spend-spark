using System.Security.Claims;
using TrueSpend.Api.ViewModels.Auth;
using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Domain.Models.Auth;

namespace TrueSpend.Api.Mappers;

public interface IAuthBootstrapMapper
{
    AuthBootstrapInput ToInput(AuthBootstrapRequestVm request, ClaimsPrincipal user);
    AuthBootstrapResponseVm ToResponse(AuthBootstrapResult result);
}

public sealed class AuthBootstrapMapper : IAuthBootstrapMapper
{
    public AuthBootstrapInput ToInput(AuthBootstrapRequestVm request, ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        var email = user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email");
        var name = user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue("name");

        return new AuthBootstrapInput(
            Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty,
            email,
            name,
            request.Locale,
            request.Timezone,
            request.CountryCode,
            request.Device is null
                ? null
                : new DeviceInput(
                    request.Device.PlatformCode,
                    request.Device.PushToken,
                    request.Device.DeviceName,
                    request.Device.AppVersion,
                    request.Device.OsVersion));
    }

    public AuthBootstrapResponseVm ToResponse(AuthBootstrapResult result) =>
        new(
            new ProfileResponseVm(
                result.Profile.DisplayName,
                result.Profile.Email,
                result.Profile.Phone,
                result.Profile.AvatarUrl,
                result.Profile.CountryCode,
                result.Profile.CurrencyCode,
                result.Profile.CurrentPlanCode),
            new PreferencesResponseVm(
                result.Preferences.Theme,
                result.Preferences.Locale,
                result.Preferences.Timezone,
                result.Preferences.HideAmounts,
                result.Preferences.BiometricUnlockEnabled),
            new AuthBootstrapPermissionsVm(
                result.Permissions.Location,
                result.Permissions.Camera,
                result.Permissions.Notifications,
                result.Permissions.Device is null
                    ? null
                    : new DeviceRequestVm(
                        result.Permissions.Device.PlatformCode,
                        result.Permissions.Device.PushToken,
                        result.Permissions.Device.DeviceName,
                        result.Permissions.Device.AppVersion,
                        result.Permissions.Device.OsVersion),
                result.Permissions.LastReportedAt),
            new OnboardingResponseVm(
                result.Onboarding.CurrentStepCode,
                result.Onboarding.CardConnectionPlaid,
                result.Onboarding.CardConnectionManual,
                result.Onboarding.CardConnectionSkipped,
                result.Onboarding.Completed),
            new AuthBootstrapEntitlementsVm(result.Entitlements.PlanCode, result.Entitlements.Features),
            result.Roles,
            result.DeviceId);
}
