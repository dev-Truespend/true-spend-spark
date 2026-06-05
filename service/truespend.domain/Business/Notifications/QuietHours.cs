using TrueSpend.Domain.Models.NotificationSettings;

namespace TrueSpend.Domain.Business.Notifications;

internal static class QuietHours
{
    public static bool IsOutsideQuietHours(NotificationDeliveryPreference pref, DateTimeOffset nowUtc, string? userTimezoneId)
    {
        if (!pref.QuietHoursEnabled || pref.QuietHoursStart is null || pref.QuietHoursEnd is null)
            return true;

        var tz = ResolveTimezone(userTimezoneId);
        var local = TimeZoneInfo.ConvertTime(nowUtc, tz);
        var currentTime = TimeOnly.FromDateTime(local.DateTime);

        var start = pref.QuietHoursStart.Value;
        var end = pref.QuietHoursEnd.Value;

        return start <= end
            ? currentTime < start || currentTime >= end
            : currentTime < start && currentTime >= end;
    }

    private static TimeZoneInfo ResolveTimezone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return TimeZoneInfo.Utc;
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch { return TimeZoneInfo.Utc; }
    }
}
