namespace TrueSpend.Domain.Models.Notifications;

public sealed record DueAdminCampaign(
    int CampaignId,
    short NotificationTypeId,
    string TitleTemplate,
    string BodyTemplate,
    string TemplateDataJson,
    string AudienceSelectorJson,
    string? AudienceCursor);

public sealed record AdminDispatchResult(
    int CampaignsProcessed,
    int NotificationsCreated,
    int GatedOut,
    int Failed)
{
    public static AdminDispatchResult Empty => new(0, 0, 0, 0);
}

public enum CampaignStatus
{
    Queued,
    Processing,
    Succeeded,
    PartiallyFailed,
    DeadLettered,
    Canceled,
}

public static class CampaignStatusCodes
{
    public const string Queued = "queued";
    public const string Processing = "processing";
    public const string Succeeded = "succeeded";
    public const string PartiallyFailed = "partially_failed";
    public const string DeadLettered = "dead_lettered";
    public const string Canceled = "canceled";
}
