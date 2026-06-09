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

public sealed class PlaidReauthNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<PlaidReauthNotificationBusiness> logger) : IPlaidReauthNotificationBusiness
{
    public async Task<int> ProduceForStatusChangeAsync(
        int plaidItemId,
        Guid userId,
        string newStatusCode,
        string? lastError,
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;
        _ = lastError;
        _ = idempotencyKey;

        if (!string.Equals(newStatusCode, PlaidConstants.ItemStatusLoginRequired, StringComparison.OrdinalIgnoreCase))
            return 0;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.SystemTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var gate = await gateService.GetGateAsync(userId, typeId, DateTimeOffset.UtcNow, cancellationToken);
        if (!gate.ShouldProduce()) return 0;

        const string title = "Reconnect your bank";
        const string body = "Your bank needs you to sign in again so we can keep your cards in sync.";

        int notificationId = 0;
        bool committed = false;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            try
            {
                notificationId = await productionService.InsertNotificationAsync(
                    new NotificationToProduce(userId, typeId, title, body, null, null, null),
                    cancellationToken);

                await productionService.UpdateNotificationPayloadAsync(
                    notificationId,
                    PushPayloadBuilder.System(notificationId, subtype: "plaid_reauth", plaidItemId: plaidItemId),
                    cancellationToken);

                await tx.CommitAsync(cancellationToken);
                committed = true;
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

        if (!committed) return 0;

        try
        {
            await dispatchBusiness.DispatchPushAsync(notificationId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Push dispatch failed for plaid-reauth notification {NotificationId}", notificationId);
        }

        try
        {
            await inboxCacheInvalidator.InvalidateAsync(userId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after plaid-reauth notification {NotificationId}", userId, notificationId);
        }

        return notificationId;
    }

    #region archive — async event-publish (disabled in MVP)
    // ProduceForStatusChangeAsync previously published NotificationCreated to the messaging outbox.
    // Consumers (2): NotificationCreatedHandler → DispatchPushAsync;
    //                InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the committing tx, after UpdateNotificationPayloadAsync:
    // var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, userId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated, "notification", notificationId,
    //     payload, $"plaid_reauth.{plaidItemId}.{idempotencyKey}", cancellationToken);
    #endregion
}
