using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class AdminNotificationCampaignService(TrueSpendDbContext db) : IAdminNotificationCampaignService
{
    public async Task<IReadOnlyList<DueAdminCampaign>> GetDueCampaignsAsync(DateTimeOffset now, int maxCampaigns, CancellationToken cancellationToken)
    {
        return await db.AdminNotificationCampaigns
            .AsNoTracking()
            .Where(c => c.Status == CampaignStatusCodes.Queued || c.Status == CampaignStatusCodes.Processing)
            .Where(c => c.ScheduledFor <= now)
            .OrderBy(c => c.ScheduledFor)
            .Take(maxCampaigns)
            .Select(c => new DueAdminCampaign(c.Id, c.NotificationTypeId, c.TitleTemplate, c.BodyTemplate, c.TemplateData, c.AudienceSelector, c.AudienceCursor))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> ResolveAudienceAsync(string audienceSelectorJson, string? cursor, int batchSize, CancellationToken cancellationToken)
    {
        var selector = ParseSelector(audienceSelectorJson);
        IQueryable<Guid> query = selector.Type switch
        {
            "all_active_users" => db.Profiles.AsNoTracking().OrderBy(p => p.UserId).Select(p => p.UserId),
            "plan_code" when !string.IsNullOrWhiteSpace(selector.PlanCode) =>
                db.Subscriptions.AsNoTracking()
                    .Join(db.Plans.AsNoTracking(), s => s.PlanId, p => p.Id, (s, p) => new { s.UserId, p.Code })
                    .Where(x => x.Code == selector.PlanCode)
                    .OrderBy(x => x.UserId)
                    .Select(x => x.UserId),
            "explicit_user_ids" when selector.UserIds.Count > 0 =>
                selector.UserIds.AsQueryable().OrderBy(g => g),
            _ => Enumerable.Empty<Guid>().AsQueryable(),
        };

        if (!string.IsNullOrWhiteSpace(cursor) && Guid.TryParse(cursor, out var cursorGuid))
            query = query.Where(g => g.CompareTo(cursorGuid) > 0);

        return await query.Take(batchSize).ToListAsync(cancellationToken);
    }

    public async Task UpdateCampaignProgressAsync(int campaignId, string? nextCursor, int notificationsCreatedDelta, int gatedOutDelta, int failedDelta, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var campaign = await db.AdminNotificationCampaigns
            .FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);
        if (campaign is null) return;

        campaign.AudienceCursor = nextCursor;
        campaign.NotificationsCreated += notificationsCreatedDelta;
        campaign.GatedOut += gatedOutDelta;
        campaign.Failed += failedDelta;
        if (campaign.Status == CampaignStatusCodes.Queued) campaign.Status = CampaignStatusCodes.Processing;
        campaign.LastProcessedAt = now;
        campaign.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task FinalizeCampaignAsync(int campaignId, string finalStatus, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var campaign = await db.AdminNotificationCampaigns
            .FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);
        if (campaign is null) return;

        campaign.Status = finalStatus;
        campaign.AudienceCursor = null;
        campaign.LastProcessedAt = now;
        campaign.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static AudienceSelector ParseSelector(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new AudienceSelector("", null, Array.Empty<Guid>());
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
            var planCode = root.TryGetProperty("planCode", out var p) ? p.GetString() : null;
            var userIds = root.TryGetProperty("userIds", out var arr) && arr.ValueKind == JsonValueKind.Array
                ? arr.EnumerateArray()
                    .Select(e => Guid.TryParse(e.GetString(), out var g) ? (Guid?)g : null)
                    .Where(g => g.HasValue)
                    .Select(g => g!.Value)
                    .ToArray()
                : Array.Empty<Guid>();
            return new AudienceSelector(type, planCode, userIds);
        }
        catch (JsonException)
        {
            return new AudienceSelector("", null, Array.Empty<Guid>());
        }
    }

    private sealed record AudienceSelector(string Type, string? PlanCode, IReadOnlyList<Guid> UserIds);
}
