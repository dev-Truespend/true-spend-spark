using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Domain.Models.Auth;

public sealed record AuthBootstrapResult(
    ProfileResult Profile,
    PreferencesResult Preferences,
    PermissionsResult Permissions,
    OnboardingResult Onboarding,
    EntitlementsResult Entitlements,
    IReadOnlyList<string> Roles,
    int? DeviceId,
    // Non-null only when the user has a deletion scheduled and still in the grace window. The client
    // routes such users to the reactivate/cancel screen until they cancel or the purge runs.
    AccountDeletionStatus? PendingDeletion);
