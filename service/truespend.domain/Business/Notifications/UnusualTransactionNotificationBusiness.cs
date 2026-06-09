using System.Globalization;
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

public sealed class UnusualTransactionNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<UnusualTransactionNotificationBusiness> logger) : IUnusualTransactionNotificationBusiness
{
    public async Task<int> ProduceForRecentTransactionsAsync(
        DateTimeOffset now,
        decimal thresholdAmount,
        TimeSpan lookback,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.UnusualTransactionTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var since = now - lookback;
        var candidates = await productionService.GetUnusualTransactionCandidatesAsync(
            since,
            thresholdAmount,
            cancellationToken);
        if (candidates.Count == 0) return 0;

        var gates = await gateService.GetGatesAsync(
            candidates.Select(c => c.UserId).Distinct().ToList(), typeId, now, cancellationToken);
        int produced = 0;

        foreach (var item in candidates)
        {
            if (!gates.TryGetValue(item.UserId, out var gate) || !gate.ShouldProduce()) continue;

            var amount = item.Amount.ToString("C2", CultureInfo.GetCultureInfo("en-US"));
            var title = "Unusually large purchase detected";
            var body = $"A {amount} transaction was just added to your account.";

            int notificationId = 0;
            bool committed = false;
            await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    notificationId = await productionService.InsertNotificationAsync(
                        new NotificationToProduce(item.UserId, typeId, title, body, item.TransactionId, null, null),
                        cancellationToken);

                    await productionService.UpdateNotificationPayloadAsync(
                        notificationId,
                        PushPayloadBuilder.UnusualTransaction(notificationId, item.TransactionId),
                        cancellationToken);

                    await tx.CommitAsync(cancellationToken);
                    committed = true;
                    produced++;
                }
                catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
                {
                    await tx.RollbackAsync(cancellationToken);
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
                logger.LogWarning(ex, "Push dispatch failed for unusual-transaction notification {NotificationId}", notificationId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(item.UserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after unusual-transaction notification {NotificationId}", item.UserId, notificationId);
            }
        }

        return produced;
    }

    #region archive — async event-publish (disabled in MVP)
    // ProduceForRecentTransactionsAsync previously published NotificationCreated for every notification
    // inserted. Consumers (2): NotificationCreatedHandler → DispatchPushAsync;
    //                          InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the per-candidate tx, after UpdateNotificationPayloadAsync:
    // var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, item.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated, "notification", notificationId,
    //     payload, $"unusual_transaction.{item.TransactionId}", cancellationToken);
    #endregion
}
