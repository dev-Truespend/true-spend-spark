namespace TrueSpend.Domain.Entities.App;

public sealed class UserPermissionEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short LocationPermissionId { get; set; }
    public short CameraPermissionId { get; set; }
    public short NotificationPermissionId { get; set; }
    public DateTimeOffset LastReportedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
