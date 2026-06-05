namespace TrueSpend.Domain.Models.Notifications;

public sealed record NotificationGate(
    bool MasterEnabled,
    bool PushEnabled,
    bool TypeEnabled,
    bool InQuietHours,
    bool HonorsQuietHours)
{
    public bool ShouldProduce() =>
        MasterEnabled
        && TypeEnabled
        && (!HonorsQuietHours || !InQuietHours);
}
