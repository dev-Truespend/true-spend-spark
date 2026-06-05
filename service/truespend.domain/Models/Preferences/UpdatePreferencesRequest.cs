namespace TrueSpend.Domain.Models.Preferences;

public sealed record UpdatePreferencesRequest(
    string? Theme,
    string? Locale,
    string? Timezone,
    bool? HideAmounts,
    bool? BiometricUnlockEnabled);
