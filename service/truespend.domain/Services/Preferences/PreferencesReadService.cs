using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Preferences;

namespace TrueSpend.Domain.Services.Preferences;

public sealed class PreferencesReadService(TrueSpendDbContext db) : IPreferencesReadService
{
    public async Task<PreferencesResponse> GetPreferencesAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var row = await db.UserPreferences.AsNoTracking()
            .Where(x => x.UserId == user.UserId)
            .Select(x => new PreferencesResponse(x.Theme, x.Locale, x.Timezone, x.HideAmounts, x.BiometricUnlockEnabled))
            .FirstOrDefaultAsync(cancellationToken);

        return row ?? new PreferencesResponse(
            AppConstants.DefaultTheme,
            AppConstants.DefaultLocale,
            AppConstants.DefaultTimezone,
            false,
            false);
    }
}
