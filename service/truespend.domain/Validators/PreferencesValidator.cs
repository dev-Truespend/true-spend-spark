using TrueSpend.Domain.Models.Preferences;

namespace TrueSpend.Domain.Validators;

public sealed class PreferencesValidator
{
    private static readonly HashSet<string> AllowedThemes = new(StringComparer.OrdinalIgnoreCase) { "light", "dark", "system" };

    public IReadOnlyList<string> ValidateUpdatePreferences(UpdatePreferencesRequest request)
    {
        var errors = new List<string>();
        if (request.Theme is { } theme && !string.IsNullOrWhiteSpace(theme) && !AllowedThemes.Contains(theme.Trim()))
        {
            errors.Add("Theme must be light, dark, or system.");
        }
        if (request.Locale is { } locale && !string.IsNullOrWhiteSpace(locale) && locale.Trim().Length > 16)
        {
            errors.Add("Locale must be 16 characters or fewer.");
        }
        if (request.Timezone is { } timezone && !string.IsNullOrWhiteSpace(timezone) && timezone.Trim().Length > 64)
        {
            errors.Add("Timezone must be 64 characters or fewer.");
        }
        return errors;
    }
}
