using System.Globalization;
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

public sealed class UnusualTransactionNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : IUnusualTransactionNotificationBusiness
{
    public async Task<int> ProduceForRecentTransactionsAsync(
        DateTimeOffset now,
        decimal thresholdAmount,
        TimeSpan lookback,
        CancellationToken cancellationToken)
    {
        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.UnusualTransactionTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var since = now - lookback;
        var candidates = await productionService.GetUnusualTransactionCandidatesAsync(
            since,
            thresholdAmount,
            cancellationToken);
        if (candidates.Count == 0) return 0;

        var gates = new Dictionary<Guid, bool>();
        int produced = 0;

        foreach (var item in candidates)
        {
            if (!gates.TryGetValue(item.UserId, out var allowed))
            {
                var gate = await gateService.GetGateAsync(item.UserId, typeId, now, cancellationToken);
                allowed = gate.ShouldProduce();
                gates[item.UserId] = allowed;
            }
            if (!allowed) continue;

            var amount = item.Amount.ToString("C2", CultureInfo.GetCultureInfo("en-US"));
            var title = "Unusually large purchase detected";
            var body = $"A {amount} transaction was just added to your account.";

            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var notificationId = await productionService.InsertNotificationAsync(
                    new NotificationToProduce(item.UserId, typeId, title, body, item.TransactionId, null, null),
                    cancellationToken);

                await productionService.UpdateNotificationPayloadAsync(
                    notificationId,
                    PushPayloadBuilder.UnusualTransaction(notificationId, item.TransactionId),
                    cancellationToken);

                var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, item.UserId));
                await messagingInsert.EnqueueOutboxEventAsync(
                    EventTypes.NotificationCreated,
                    "notification",
                    notificationId,
                    payload,
                    $"unusual_transaction.{item.TransactionId}",
                    cancellationToken);

                await tx.CommitAsync(cancellationToken);
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

        return produced;
    }
}
