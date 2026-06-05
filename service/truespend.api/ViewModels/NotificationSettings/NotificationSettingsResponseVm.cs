namespace TrueSpend.Api.ViewModels.NotificationSettings;

public sealed record NotificationSettingsResponseVm(
    bool MasterEnabled,
    bool PushEnabled,
    bool EmailEnabled,
    bool QuietHoursEnabled,
    string? QuietHoursStart,
    string? QuietHoursEnd,
    IReadOnlyList<NotificationTypeVm> Types);
