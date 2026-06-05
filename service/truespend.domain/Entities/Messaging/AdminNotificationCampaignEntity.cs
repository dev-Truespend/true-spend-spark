namespace TrueSpend.Domain.Entities.Messaging;

public sealed class AdminNotificationCampaignEntity
{
    public int Id { get; set; }
    public short NotificationTypeId { get; set; }
    public string TitleTemplate { get; set; } = string.Empty;
    public string BodyTemplate { get; set; } = string.Empty;
    public string TemplateData { get; set; } = "{}";
    public string AudienceSelector { get; set; } = "{}";
    public DateTimeOffset ScheduledFor { get; set; }
    public string Status { get; set; } = "queued";
    public string? AudienceCursor { get; set; }
    public string? IdempotencyKey { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public int? TotalRecipients { get; set; }
    public int NotificationsCreated { get; set; }
    public int GatedOut { get; set; }
    public int Failed { get; set; }
    public DateTimeOffset? LastProcessedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
