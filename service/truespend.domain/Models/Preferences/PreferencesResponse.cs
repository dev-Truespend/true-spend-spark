namespace TrueSpend.Domain.Models.Preferences;

public sealed record PreferencesResponse(
    string Theme,
    string Locale,
    string Timezone,
    bool HideAmounts,
    bool BiometricUnlockEnabled);
