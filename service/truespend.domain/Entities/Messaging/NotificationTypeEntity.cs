namespace TrueSpend.Domain.Entities.Messaging;

public sealed class NotificationTypeEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool DefaultEnabled { get; set; } = true;
    public bool HonorsQuietHours { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
