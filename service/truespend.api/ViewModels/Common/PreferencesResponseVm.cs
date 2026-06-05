namespace TrueSpend.Api.ViewModels.Common;

public sealed record PreferencesResponseVm(
    string Theme,
    string Locale,
    string Timezone,
    bool HideAmounts,
    bool BiometricUnlockEnabled);
