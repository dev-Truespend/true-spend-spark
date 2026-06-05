using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Events.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using System.Text.Json.Nodes;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsProductionBusiness(
    INotificationProductionService service,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : INotificationsProductionBusiness
{
    public async Task<int> FireDueRemindersAsync(CancellationToken cancellationToken)
    {
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

            var gate = await gateService.GetGateAsync(reminder.UserId, typeId, now, cancellationToken);
            if (!gate.ShouldProduce()) continue;

            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var input = new NotificationToProduce(
                    reminder.UserId, typeId, reminder.Title, reminder.Body,
                    RelatedTransactionId: null, RelatedMissedRewardEventId: null, Payload: null);
                var notificationId = await service.InsertNotificationAsync(input, cancellationToken);

                var reminderPayload = BuildReminderPayload(notificationId, source);
                await service.UpdateNotificationPayloadAsync(notificationId, reminderPayload, cancellationToken);

                var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, reminder.UserId));
                await messagingInsert.EnqueueOutboxEventAsync(
                    EventTypes.NotificationCreated,
                    "notification",
                    notificationId,
                    payload,
                    $"reminder.fired.{reminder.Id}",
                    cancellationToken);

                await service.MarkReminderFiredAsync(reminder.Id, now, cancellationToken);

                await tx.CommitAsync(cancellationToken);
                fired++;
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
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
}
