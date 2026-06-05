namespace TrueSpend.Api.ViewModels.Preferences;

public sealed record UpdatePreferencesRequestVm(
    string? Theme,
    string? Locale,
    string? Timezone,
    bool? HideAmounts,
    bool? BiometricUnlockEnabled);
