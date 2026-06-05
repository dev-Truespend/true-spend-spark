namespace TrueSpend.Domain.Models.NotificationSettings;

public sealed record UpdateNotificationSettingsRequest(bool MasterEnabled, bool PushEnabled, bool EmailEnabled, bool QuietHoursEnabled, string? QuietHoursStart, string? QuietHoursEnd);
