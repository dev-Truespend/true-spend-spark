namespace TrueSpend.Domain.Models.NotificationSettings;

public sealed record NotificationSettingsResponse(bool MasterEnabled, bool PushEnabled, bool EmailEnabled, bool QuietHoursEnabled, string? QuietHoursStart, string? QuietHoursEnd, IReadOnlyList<NotificationType> Types);
