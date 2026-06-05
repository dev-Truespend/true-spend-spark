using System.Globalization;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;

namespace TrueSpend.Domain.Validators;

public sealed class NotificationsValidator
{
    public IReadOnlyList<string> ValidateCreateReminder(CreateNotificationReminderRequest request)
    {
        var errors = new List<string>();
        if (request.RemindAt <= DateTimeOffset.UtcNow)
            errors.Add("Remind at must be in the future.");
        if (string.IsNullOrWhiteSpace(request.Title))
            errors.Add("Title is required.");
        if (string.IsNullOrWhiteSpace(request.Body))
            errors.Add("Body is required.");
        return errors;
    }

    public IReadOnlyList<string> ValidateNotificationSettings(UpdateNotificationSettingsRequest request)
    {
        var errors = new List<string>();
        if (request.QuietHoursEnabled)
        {
            if (string.IsNullOrWhiteSpace(request.QuietHoursStart)) errors.Add("Quiet hours start is required.");
            else if (!IsValidTime(request.QuietHoursStart)) errors.Add("Quiet hours start must be in HH:mm format.");
            if (string.IsNullOrWhiteSpace(request.QuietHoursEnd)) errors.Add("Quiet hours end is required.");
            else if (!IsValidTime(request.QuietHoursEnd)) errors.Add("Quiet hours end must be in HH:mm format.");
        }
        return errors;
    }

    public IReadOnlyList<string> ValidateTypePreference(UpdateNotificationTypePreferenceRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.TypeCode)) errors.Add("Type code is required.");
        return errors;
    }

    private static bool IsValidTime(string value) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}
