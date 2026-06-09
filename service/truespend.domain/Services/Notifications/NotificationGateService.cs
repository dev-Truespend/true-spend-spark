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

        return BuildGate(
            pref?.MasterEnabled,
            pref?.PushEnabled,
            pref?.QuietHoursEnabled,
            pref?.QuietHoursStart,
            pref?.QuietHoursEnd,
            typePrefIsEnabled,
            typeDefaults?.DefaultEnabled,
            typeDefaults?.HonorsQuietHours,
            timezone,
            now);
    }

    public async Task<IReadOnlyDictionary<Guid, NotificationGate>> GetGatesAsync(
        IReadOnlyCollection<Guid> userIds,
        short notificationTypeId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<Guid, NotificationGate>();
        if (userIds.Count == 0) return result;

        var ids = userIds.Distinct().ToList();

        var prefs = await db.NotificationPreferences.AsNoTracking()
            .Where(p => ids.Contains(p.UserId))
            .Select(p => new
            {
                p.UserId,
                p.MasterEnabled,
                p.PushEnabled,
                p.QuietHoursEnabled,
                p.QuietHoursStart,
                p.QuietHoursEnd
            })
            .ToDictionaryAsync(p => p.UserId, cancellationToken);

        var typePrefs = await db.NotificationTypePreferences.AsNoTracking()
            .Where(p => ids.Contains(p.UserId) && p.NotificationTypeId == notificationTypeId)
            .Select(p => new { p.UserId, p.IsEnabled })
            .ToDictionaryAsync(p => p.UserId, p => (bool?)p.IsEnabled, cancellationToken);

        // Type defaults are per-type, not per-user: one row shared across every user in the batch.
        var typeDefaults = await db.NotificationTypes.AsNoTracking()
            .Where(t => t.Id == notificationTypeId)
            .Select(t => new { t.DefaultEnabled, t.HonorsQuietHours })
            .FirstOrDefaultAsync(cancellationToken);

        var timezones = await db.UserPreferences.AsNoTracking()
            .Where(p => ids.Contains(p.UserId))
            .Select(p => new { p.UserId, p.Timezone })
            .ToDictionaryAsync(p => p.UserId, p => p.Timezone, cancellationToken);

        foreach (var userId in ids)
        {
            prefs.TryGetValue(userId, out var pref);
            typePrefs.TryGetValue(userId, out var typePrefIsEnabled);
            timezones.TryGetValue(userId, out var timezone);

            result[userId] = BuildGate(
                pref?.MasterEnabled,
                pref?.PushEnabled,
                pref?.QuietHoursEnabled,
                pref?.QuietHoursStart,
                pref?.QuietHoursEnd,
                typePrefIsEnabled,
                typeDefaults?.DefaultEnabled,
                typeDefaults?.HonorsQuietHours,
                timezone,
                now);
        }

        return result;
    }

    // Single source of truth for assembling a gate from raw preference values. Both the single-user
    // and batched paths funnel through here so the defaulting rules stay identical.
    private static NotificationGate BuildGate(
        bool? masterEnabled,
        bool? pushEnabled,
        bool? quietHoursEnabled,
        TimeOnly? quietHoursStart,
        TimeOnly? quietHoursEnd,
        bool? typePrefIsEnabled,
        bool? typeDefaultEnabled,
        bool? typeHonorsQuietHours,
        string? timezone,
        DateTimeOffset now)
    {
        var master = masterEnabled ?? true;
        var push = pushEnabled ?? true;
        var typeEnabled = typePrefIsEnabled ?? typeDefaultEnabled ?? true;
        var honorsQuietHours = typeHonorsQuietHours ?? true;
        var inQuietHours = ComputeInQuietHours(
            quietHoursEnabled ?? false,
            quietHoursStart,
            quietHoursEnd,
            timezone,
            now);

        return new NotificationGate(master, push, typeEnabled, inQuietHours, honorsQuietHours);
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
