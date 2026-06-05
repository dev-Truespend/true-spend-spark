namespace TrueSpend.Domain.Entities.App;

public sealed class UserDevicePermissionEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int DeviceId { get; set; }
    public short LocationPermissionId { get; set; }
    public short CameraPermissionId { get; set; }
    public short NotificationPermissionId { get; set; }
    public string? LocationAccuracy { get; set; }
    public string? RawPlatformPayload { get; set; }
    public DateTimeOffset LastReportedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
