using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Auth;

public sealed record AuthBootstrapResponseVm(
    ProfileResponseVm Profile,
    PreferencesResponseVm Preferences,
    AuthBootstrapPermissionsVm Permissions,
    OnboardingResponseVm Onboarding,
    AuthBootstrapEntitlementsVm Entitlements,
    IReadOnlyList<string> Roles,
    int? DeviceId);
