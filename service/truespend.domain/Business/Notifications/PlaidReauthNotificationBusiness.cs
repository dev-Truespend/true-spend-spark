using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Persistence;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class PlaidReauthNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : IPlaidReauthNotificationBusiness
{
    public async Task<int> ProduceForStatusChangeAsync(
        int plaidItemId,
        Guid userId,
        string newStatusCode,
        string? lastError,
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(newStatusCode, PlaidConstants.ItemStatusLoginRequired, StringComparison.OrdinalIgnoreCase))
            return 0;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.SystemTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var gate = await gateService.GetGateAsync(userId, typeId, DateTimeOffset.UtcNow, cancellationToken);
        if (!gate.ShouldProduce()) return 0;

        const string title = "Reconnect your bank";
        const string body = "Your bank needs you to sign in again so we can keep your cards in sync.";

        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            var notificationId = await productionService.InsertNotificationAsync(
                new NotificationToProduce(userId, typeId, title, body, null, null, null),
                cancellationToken);

            await productionService.UpdateNotificationPayloadAsync(
                notificationId,
                PushPayloadBuilder.System(notificationId, subtype: "plaid_reauth", plaidItemId: plaidItemId),
                cancellationToken);

            var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, userId));
            await messagingInsert.EnqueueOutboxEventAsync(
                EventTypes.NotificationCreated,
                "notification",
                notificationId,
                payload,
                $"plaid_reauth.{plaidItemId}.{idempotencyKey}",
                cancellationToken);

            await tx.CommitAsync(cancellationToken);
            return notificationId;
        }
        catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
        {
            await tx.RollbackAsync(cancellationToken);
            return 0;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
