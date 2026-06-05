using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface IAdminNotificationCampaignService
{
    Task<IReadOnlyList<DueAdminCampaign>> GetDueCampaignsAsync(DateTimeOffset now, int maxCampaigns, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> ResolveAudienceAsync(string audienceSelectorJson, string? cursor, int batchSize, CancellationToken cancellationToken);
    Task UpdateCampaignProgressAsync(int campaignId, string? nextCursor, int notificationsCreatedDelta, int gatedOutDelta, int failedDelta, DateTimeOffset now, CancellationToken cancellationToken);
    Task FinalizeCampaignAsync(int campaignId, string finalStatus, DateTimeOffset now, CancellationToken cancellationToken);
}
