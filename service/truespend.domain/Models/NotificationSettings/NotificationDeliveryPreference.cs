namespace TrueSpend.Domain.Models.NotificationSettings;

public sealed record NotificationDeliveryPreference(
    bool MasterEnabled,
    bool PushEnabled,
    bool EmailEnabled,
    bool QuietHoursEnabled,
    TimeOnly? QuietHoursStart,
    TimeOnly? QuietHoursEnd);
