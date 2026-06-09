using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsProductionBusiness(
    INotificationProductionService service,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<NotificationsProductionBusiness> logger) : INotificationsProductionBusiness
{
    public async Task<int> FireDueRemindersAsync(CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var now = DateTimeOffset.UtcNow;
        var dueReminders = await service.GetDueRemindersAsync(now, cancellationToken);

        if (dueReminders.Count == 0) return 0;

        var systemTypeId = await service.GetSystemNotificationTypeIdAsync(cancellationToken);

        var sourceIds = dueReminders
            .Where(r => r.SourceNotificationId.HasValue)
            .Select(r => r.SourceNotificationId!.Value)
            .Distinct()
            .ToList();
        var sourceInfos = await service.GetSourceNotificationsAsync(sourceIds, cancellationToken);

        // A reminder's gate type depends on its source notification, so the batch spans several types.
        // Resolve the distinct (user, type) pairs first and batch-gate one type at a time — a fixed
        // number of queries per distinct type rather than one set of queries per reminder.
        var pairs = new HashSet<(Guid UserId, short TypeId)>();
        foreach (var reminder in dueReminders)
        {
            var pairTypeId = systemTypeId;
            if (reminder.SourceNotificationId.HasValue &&
                sourceInfos.TryGetValue(reminder.SourceNotificationId.Value, out var srcInfo))
            {
                pairTypeId = srcInfo.NotificationTypeId;
            }
            pairs.Add((reminder.UserId, pairTypeId));
        }

        var gatesByKey = new Dictionary<(Guid, short), NotificationGate>();
        foreach (var grp in pairs.GroupBy(p => p.TypeId))
        {
            var groupUserIds = grp.Select(p => p.UserId).Distinct().ToList();
            var groupGates = await gateService.GetGatesAsync(groupUserIds, grp.Key, now, cancellationToken);
            foreach (var kv in groupGates)
            {
                gatesByKey[(kv.Key, grp.Key)] = kv.Value;
            }
        }

        int fired = 0;

        foreach (var reminder in dueReminders)
        {
            short typeId = systemTypeId;
            SourceNotificationInfo? source = null;
            if (reminder.SourceNotificationId.HasValue &&
                sourceInfos.TryGetValue(reminder.SourceNotificationId.Value, out var srcInfo))
            {
                typeId = srcInfo.NotificationTypeId;
                source = srcInfo;
            }

            if (!gatesByKey.TryGetValue((reminder.UserId, typeId), out var gate) || !gate.ShouldProduce()) continue;

            int notificationId = 0;
            bool committed = false;
            await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    var input = new NotificationToProduce(
                        reminder.UserId, typeId, reminder.Title, reminder.Body,
                        RelatedTransactionId: null, RelatedMissedRewardEventId: null, Payload: null);
                    notificationId = await service.InsertNotificationAsync(input, cancellationToken);

                    var reminderPayload = BuildReminderPayload(notificationId, source);
                    await service.UpdateNotificationPayloadAsync(notificationId, reminderPayload, cancellationToken);

                    await service.MarkReminderFiredAsync(reminder.Id, now, cancellationToken);

                    await tx.CommitAsync(cancellationToken);
                    committed = true;
                    fired++;
                }
                catch
                {
                    await tx.RollbackAsync(cancellationToken);
                    throw;
                }
            }

            if (!committed) continue;

            try
            {
                await dispatchBusiness.DispatchPushAsync(notificationId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Push dispatch failed for reminder notification {NotificationId}", notificationId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(reminder.UserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after reminder notification {NotificationId}", reminder.UserId, notificationId);
            }
        }

        return fired;
    }

    // Per notification-production.md § Producer Catalog, the reminder push inherits the source
    // notification's payload type so the mobile router can deep-link the reminder tap back into
    // the same detail flow (transaction, recommendation, etc.). Falls back to the System payload
    // when no source notification is recorded.
    private static string BuildReminderPayload(int newNotificationId, SourceNotificationInfo? source)
    {
        if (source is null || string.IsNullOrWhiteSpace(source.Payload))
        {
            return PushPayloadBuilder.System(newNotificationId, subtype: "reminder");
        }

        try
        {
            if (JsonNode.Parse(source.Payload) is JsonObject obj)
            {
                obj["notificationId"] = newNotificationId;
                obj["reminder"] = true;
                obj["sourceNotificationId"] = source.SourceNotificationId;
                return obj.ToJsonString();
            }
        }
        catch (JsonException)
        {
            // Source payload is malformed — fall through to the system payload.
        }

        return PushPayloadBuilder.System(newNotificationId, subtype: "reminder");
    }

    #region archive — async event-publish (disabled in MVP)
    // FireDueRemindersAsync previously published NotificationCreated for every reminder fired.
    // Consumers (2): NotificationCreatedHandler → DispatchPushAsync;
    //                InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the per-reminder tx, after MarkReminderFiredAsync:
    // var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, reminder.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated, "notification", notificationId,
    //     payload, $"reminder.fired.{reminder.Id}", cancellationToken);
    #endregion
}
