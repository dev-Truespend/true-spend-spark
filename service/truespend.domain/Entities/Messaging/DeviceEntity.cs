namespace TrueSpend.Domain.Entities.Messaging;

public sealed class DeviceEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short PlatformId { get; set; }
    public string? PushToken { get; set; }
    public string? DeviceName { get; set; }
    public string? AppVersion { get; set; }
    public string? OsVersion { get; set; }
    public string? Locale { get; set; }
    public string? Timezone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
