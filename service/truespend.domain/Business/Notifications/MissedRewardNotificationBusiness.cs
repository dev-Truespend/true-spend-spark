using System.Globalization;
using System.Text.Json;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class MissedRewardNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : IMissedRewardNotificationBusiness
{
    public async Task<int> ProduceForMissedRewardEventAsync(int missedRewardEventId, CancellationToken cancellationToken)
    {
        var item = await productionService.GetMissedRewardForNotificationAsync(missedRewardEventId, cancellationToken);
        if (item is null) return 0;

        if (await productionService.HasExistingMissedRewardNotificationAsync(item.MissedRewardEventId, cancellationToken))
            return 0;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.MissedRewardsTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var gate = await gateService.GetGateAsync(item.UserId, typeId, DateTimeOffset.UtcNow, cancellationToken);
        if (!gate.ShouldProduce()) return 0;

        var title = "You missed rewards on a recent purchase";
        var body = BuildBody(item);

        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var notificationId = await productionService.InsertNotificationAsync(
                new NotificationToProduce(
                    item.UserId,
                    typeId,
                    title,
                    body,
                    item.TransactionId,
                    item.MissedRewardEventId,
                    null),
                cancellationToken);

            await productionService.UpdateNotificationPayloadAsync(
                notificationId,
                PushPayloadBuilder.MissedRewards(notificationId, item.TransactionId, item.MissedRewardEventId),
                cancellationToken);

            var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, item.UserId));
            await messagingInsert.EnqueueOutboxEventAsync(
                EventTypes.NotificationCreated,
                "notification",
                notificationId,
                payload,
                $"missed_reward.{item.MissedRewardEventId}",
                cancellationToken);

            await tx.CommitAsync(cancellationToken);
            return notificationId;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static string BuildBody(MissedRewardForNotification item)
    {
        var amount = item.MissedAmount.ToString("C2", CultureInfo.GetCultureInfo("en-US"));
        if (!string.IsNullOrWhiteSpace(item.BetterCardName))
        {
            return $"You could have earned {amount} more by paying with {item.BetterCardName}.";
        }
        return $"You missed about {amount} in rewards on this purchase.";
    }
}
