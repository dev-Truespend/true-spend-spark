using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationGateService(TrueSpendDbContext db) : INotificationGateService
{
    public async Task<NotificationGate> GetGateAsync(
        Guid userId,
        short notificationTypeId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var pref = await db.NotificationPreferences.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new
            {
                p.MasterEnabled,
                p.PushEnabled,
                p.QuietHoursEnabled,
                p.QuietHoursStart,
                p.QuietHoursEnd
            })
            .FirstOrDefaultAsync(cancellationToken);

        var typePrefIsEnabled = await db.NotificationTypePreferences.AsNoTracking()
            .Where(p => p.UserId == userId && p.NotificationTypeId == notificationTypeId)
            .Select(p => (bool?)p.IsEnabled)
            .FirstOrDefaultAsync(cancellationToken);

        var typeDefaults = await db.NotificationTypes.AsNoTracking()
            .Where(t => t.Id == notificationTypeId)
            .Select(t => new { t.DefaultEnabled, t.HonorsQuietHours })
            .FirstOrDefaultAsync(cancellationToken);

        var timezone = await db.UserPreferences.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.Timezone)
            .FirstOrDefaultAsync(cancellationToken);

        var masterEnabled = pref?.MasterEnabled ?? true;
        var pushEnabled = pref?.PushEnabled ?? true;
        var typeEnabled = typePrefIsEnabled ?? typeDefaults?.DefaultEnabled ?? true;
        var honorsQuietHours = typeDefaults?.HonorsQuietHours ?? true;
        var inQuietHours = ComputeInQuietHours(pref?.QuietHoursEnabled ?? false,
            pref?.QuietHoursStart,
            pref?.QuietHoursEnd,
            timezone,
            now);

        return new NotificationGate(masterEnabled, pushEnabled, typeEnabled, inQuietHours, honorsQuietHours);
    }

    private static bool ComputeInQuietHours(
        bool quietHoursEnabled,
        TimeOnly? quietHoursStart,
        TimeOnly? quietHoursEnd,
        string? timezone,
        DateTimeOffset now)
    {
        if (!quietHoursEnabled || quietHoursStart is null || quietHoursEnd is null) return false;

        DateTimeOffset local;
        try
        {
            var tz = string.IsNullOrWhiteSpace(timezone)
                ? TimeZoneInfo.Utc
                : TimeZoneInfo.FindSystemTimeZoneById(timezone);
            local = TimeZoneInfo.ConvertTime(now, tz);
        }
        catch (TimeZoneNotFoundException)
        {
            local = now;
        }
        catch (InvalidTimeZoneException)
        {
            local = now;
        }

        var current = TimeOnly.FromDateTime(local.DateTime);
        var start = quietHoursStart.Value;
        var end = quietHoursEnd.Value;
        return start <= end
            ? current >= start && current < end
            : current >= start || current < end;
    }
}
