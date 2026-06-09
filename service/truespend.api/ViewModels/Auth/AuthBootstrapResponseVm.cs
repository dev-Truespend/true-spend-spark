using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Privacy;

namespace TrueSpend.Api.ViewModels.Auth;

public sealed record AuthBootstrapResponseVm(
    ProfileResponseVm Profile,
    PreferencesResponseVm Preferences,
    AuthBootstrapPermissionsVm Permissions,
    OnboardingResponseVm Onboarding,
    AuthBootstrapEntitlementsVm Entitlements,
    IReadOnlyList<string> Roles,
    int? DeviceId,
    // Null unless the user signed in with a deletion still scheduled (grace window).
    AccountDeletionStatusResponseVm? AccountDeletion);
