using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.NotificationSettings;

public sealed class NotificationSettingsReadService(TrueSpendDbContext db) : INotificationSettingsReadService
{
    public async Task<NotificationSettingsResponse> GetSettingsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var prefs = await db.NotificationPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        var types = await db.NotificationTypes.AsNoTracking().Where(x => x.IsActive).ToListAsync(cancellationToken);
        var userTypePrefs = await db.NotificationTypePreferences.AsNoTracking()
            .Where(x => x.UserId == user.UserId)
            .ToDictionaryAsync(x => x.NotificationTypeId, x => x.IsEnabled, cancellationToken);

        var typeVms = types
            .Select(t => new NotificationType(t.Code, t.DisplayName, userTypePrefs.GetValueOrDefault(t.Id, t.DefaultEnabled)))
            .ToList();

        if (prefs is null)
        {
            return new NotificationSettingsResponse(true, true, true, false, null, null, typeVms);
        }

        return new NotificationSettingsResponse(
            prefs.MasterEnabled,
            prefs.PushEnabled,
            prefs.EmailEnabled,
            prefs.QuietHoursEnabled,
            prefs.QuietHoursStart?.ToString("HH:mm"),
            prefs.QuietHoursEnd?.ToString("HH:mm"),
            typeVms);
    }
}
