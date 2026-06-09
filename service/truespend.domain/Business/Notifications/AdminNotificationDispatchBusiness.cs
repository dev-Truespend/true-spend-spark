using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Persistence;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class AdminNotificationDispatchBusiness(
    IAdminNotificationCampaignService campaignService,
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<AdminNotificationDispatchBusiness> logger) : IAdminNotificationDispatchBusiness
{
    private const int MaxCampaignsPerRun = 10;
    private const int BatchSize = 500;

    public async Task<AdminDispatchResult> DispatchDueCampaignsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var campaigns = await campaignService.GetDueCampaignsAsync(now, MaxCampaignsPerRun, cancellationToken);
        if (campaigns.Count == 0) return AdminDispatchResult.Empty;

        var totalCreated = 0;
        var totalGatedOut = 0;
        var totalFailed = 0;

        foreach (var campaign in campaigns)
        {
            if (cancellationToken.IsCancellationRequested) break;

            try
            {
                var userIds = await campaignService.ResolveAudienceAsync(campaign.AudienceSelectorJson, campaign.AudienceCursor, BatchSize, cancellationToken);
                if (userIds.Count == 0)
                {
                    await campaignService.FinalizeCampaignAsync(campaign.CampaignId, CampaignStatusCodes.Succeeded, now, cancellationToken);
                    continue;
                }

                var templateValues = ParseTemplateData(campaign.TemplateDataJson);
                var title = RenderTemplate(campaign.TitleTemplate, templateValues);
                var body = RenderTemplate(campaign.BodyTemplate, templateValues);

                var batchCreated = 0;
                var batchGated = 0;
                var batchFailed = 0;

                var gates = await gateService.GetGatesAsync(userIds, campaign.NotificationTypeId, now, cancellationToken);

                foreach (var userId in userIds)
                {
                    if (!gates.TryGetValue(userId, out var gate) || !gate.ShouldProduce()) { batchGated++; continue; }

                    int notificationId = 0;
                    bool committed = false;
                    await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
                    {
                        try
                        {
                            notificationId = await productionService.InsertNotificationAsync(
                                new NotificationToProduce(userId, campaign.NotificationTypeId, title, body, null, null, null),
                                cancellationToken);

                            await tx.CommitAsync(cancellationToken);
                            committed = true;
                            batchCreated++;
                        }
                        catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
                        {
                            await tx.RollbackAsync(cancellationToken);
                        }
                        catch
                        {
                            await tx.RollbackAsync(cancellationToken);
                            batchFailed++;
                        }
                    }

                    if (!committed) continue;

                    try
                    {
                        await dispatchBusiness.DispatchPushAsync(notificationId, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Push dispatch failed for admin-campaign notification {NotificationId} (campaign {CampaignId})", notificationId, campaign.CampaignId);
                    }

                    try
                    {
                        await inboxCacheInvalidator.InvalidateAsync(userId, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after admin-campaign notification {NotificationId}", userId, notificationId);
                    }
                }

                totalCreated += batchCreated;
                totalGatedOut += batchGated;
                totalFailed += batchFailed;

                var nextCursor = userIds.Count == BatchSize ? userIds[^1].ToString() : null;
                await campaignService.UpdateCampaignProgressAsync(campaign.CampaignId, nextCursor, batchCreated, batchGated, batchFailed, now, cancellationToken);

                if (nextCursor is null)
                {
                    var finalStatus = batchFailed > 0 ? CampaignStatusCodes.PartiallyFailed : CampaignStatusCodes.Succeeded;
                    await campaignService.FinalizeCampaignAsync(campaign.CampaignId, finalStatus, now, cancellationToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Admin notification campaign {CampaignId} dispatch failed", campaign.CampaignId);
                totalFailed++;
            }
        }

        return new AdminDispatchResult(campaigns.Count, totalCreated, totalGatedOut, totalFailed);
    }

    private static IReadOnlyDictionary<string, string> ParseTemplateData(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>();
        try
        {
            if (JsonNode.Parse(json) is JsonObject obj)
            {
                return obj
                    .Where(kv => kv.Value is not null)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.ToString());
            }
        }
        catch (System.Text.Json.JsonException) { }
        return new Dictionary<string, string>();
    }

    private static string RenderTemplate(string template, IReadOnlyDictionary<string, string> values)
    {
        if (string.IsNullOrEmpty(template) || values.Count == 0) return template;
        var result = template;
        foreach (var kv in values)
        {
            result = result.Replace("{{" + kv.Key + "}}", kv.Value, StringComparison.Ordinal);
        }
        return result;
    }

    #region archive — async event-publish (disabled in MVP)
    // DispatchDueCampaignsAsync previously published NotificationCreated for every notification it
    // inserted. Consumers (2): NotificationCreatedHandler → DispatchPushAsync;
    //                          InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the per-user tx, after InsertNotificationAsync:
    // var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, userId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated, "notification", notificationId,
    //     payload, $"admin_campaign.{campaign.CampaignId}.{userId:N}", cancellationToken);
    #endregion
}
