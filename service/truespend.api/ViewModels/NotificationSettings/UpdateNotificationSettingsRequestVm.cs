namespace TrueSpend.Api.ViewModels.NotificationSettings;

public sealed record UpdateNotificationSettingsRequestVm(
    bool MasterEnabled,
    bool PushEnabled,
    bool EmailEnabled,
    bool QuietHoursEnabled,
    string? QuietHoursStart,
    string? QuietHoursEnd);
