namespace TrueSpend.Domain.Models.Auth;

public sealed record AuthBootstrapResult(
    ProfileResult Profile,
    PreferencesResult Preferences,
    PermissionsResult Permissions,
    OnboardingResult Onboarding,
    EntitlementsResult Entitlements,
    IReadOnlyList<string> Roles,
    int? DeviceId);
