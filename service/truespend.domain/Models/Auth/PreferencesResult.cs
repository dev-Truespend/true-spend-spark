namespace TrueSpend.Domain.Models.Auth;

public sealed record PreferencesResult(
    string Theme,
    string Locale,
    string Timezone,
    bool HideAmounts,
    bool BiometricUnlockEnabled);
