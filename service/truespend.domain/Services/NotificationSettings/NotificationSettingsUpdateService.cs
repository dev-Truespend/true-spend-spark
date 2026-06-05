using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using TrueSpend.Domain.Entities.Messaging;

namespace TrueSpend.Domain.Services.NotificationSettings;

public sealed class NotificationSettingsUpdateService(TrueSpendDbContext db, INotificationSettingsReadService readService) : INotificationSettingsUpdateService
{
    public async Task<NotificationSettingsResponse> SaveSettingsAsync(
        OnboardingWorkflowUser user,
        NotificationSettingsResponse settings,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var prefs = await db.NotificationPreferences.FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        if (prefs is null)
        {
            prefs = new NotificationPreferenceEntity { UserId = user.UserId, CreatedAt = now };
            db.NotificationPreferences.Add(prefs);
        }

        prefs.MasterEnabled = settings.MasterEnabled;
        prefs.PushEnabled = settings.PushEnabled;
        prefs.EmailEnabled = settings.EmailEnabled;
        prefs.QuietHoursEnabled = settings.QuietHoursEnabled;
        prefs.QuietHoursStart = ParseTime(settings.QuietHoursStart);
        prefs.QuietHoursEnd = ParseTime(settings.QuietHoursEnd);
        prefs.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
        return settings;
    }

    public async Task<NotificationSettingsResponse> SaveTypePreferenceAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationTypePreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var notificationType = await db.NotificationTypes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Code == request.TypeCode && x.IsActive, cancellationToken);

        if (notificationType is null)
            throw new KeyNotFoundException($"Notification type '{request.TypeCode}' not found.");

        var pref = await db.NotificationTypePreferences
            .FirstOrDefaultAsync(x => x.UserId == user.UserId && x.NotificationTypeId == notificationType.Id, cancellationToken);

        if (pref is null)
        {
            pref = new NotificationTypePreferenceEntity
            {
                UserId = user.UserId,
                NotificationTypeId = notificationType.Id,
                IsEnabled = request.Enabled,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.NotificationTypePreferences.Add(pref);
        }
        else
        {
            pref.IsEnabled = request.Enabled;
            pref.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return await readService.GetSettingsAsync(user, cancellationToken);
    }

    private static TimeOnly? ParseTime(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null
            : TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) ? parsed : null;
}
