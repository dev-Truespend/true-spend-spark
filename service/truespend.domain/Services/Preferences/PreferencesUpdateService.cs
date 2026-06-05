using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Preferences;

namespace TrueSpend.Domain.Services.Preferences;

public sealed class PreferencesUpdateService(TrueSpendDbContext db) : IPreferencesUpdateService
{
    public async Task<PreferencesResponse> UpdatePreferencesAsync(OnboardingWorkflowUser user, UpdatePreferencesRequest request, CancellationToken cancellationToken)
    {
        var entity = await db.UserPreferences.FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (entity is null)
        {
            entity = new UserPreferenceEntity
            {
                UserId = user.UserId,
                Theme = AppConstants.DefaultTheme,
                Locale = AppConstants.DefaultLocale,
                Timezone = AppConstants.DefaultTimezone,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.UserPreferences.Add(entity);
        }

        if (request.Theme is { } theme && !string.IsNullOrWhiteSpace(theme))
        {
            entity.Theme = theme.Trim();
        }
        if (request.Locale is { } locale && !string.IsNullOrWhiteSpace(locale))
        {
            entity.Locale = locale.Trim();
        }
        if (request.Timezone is { } timezone && !string.IsNullOrWhiteSpace(timezone))
        {
            entity.Timezone = timezone.Trim();
        }
        if (request.HideAmounts is { } hideAmounts)
        {
            entity.HideAmounts = hideAmounts;
        }
        if (request.BiometricUnlockEnabled is { } biometric)
        {
            entity.BiometricUnlockEnabled = biometric;
        }

        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return new PreferencesResponse(entity.Theme, entity.Locale, entity.Timezone, entity.HideAmounts, entity.BiometricUnlockEnabled);
    }
}
