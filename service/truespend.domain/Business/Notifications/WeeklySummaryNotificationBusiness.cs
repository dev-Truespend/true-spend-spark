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

public sealed class WeeklySummaryNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<WeeklySummaryNotificationBusiness> logger) : IWeeklySummaryNotificationBusiness
{
    public async Task<int> ProduceForCurrentHourAsync(
        DateTimeOffset now,
        DayOfWeek fireDay,
        int fireHour,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.WeeklySummaryTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var users = await productionService.GetActiveUsersWithTimezoneAsync(cancellationToken);
        if (users.Count == 0) return 0;

        var firing = users.Where(u => IsFiringHour(now, u.Timezone, fireDay, fireHour)).ToList();
        if (firing.Count == 0) return 0;

        var gates = await gateService.GetGatesAsync(
            firing.Select(u => u.UserId).ToList(), typeId, now, cancellationToken);

        int produced = 0;
        foreach (var user in firing)
        {
            if (!gates.TryGetValue(user.UserId, out var gate) || !gate.ShouldProduce()) continue;

            int notificationId = 0;
            bool committed = false;
            await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    notificationId = await productionService.InsertNotificationAsync(
                        new NotificationToProduce(
                            user.UserId,
                            typeId,
                            "Your weekly rewards summary",
                            "Tap to see how your cards performed this week.",
                            null,
                            null,
                            null),
                        cancellationToken);

                    await productionService.UpdateNotificationPayloadAsync(
                        notificationId,
                        PushPayloadBuilder.WeeklySummary(notificationId),
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
                logger.LogWarning(ex, "Push dispatch failed for weekly-summary notification {NotificationId}", notificationId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(user.UserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after weekly-summary notification {NotificationId}", user.UserId, notificationId);
            }
        }

        return produced;
    }

    private static bool IsFiringHour(DateTimeOffset now, string? timezone, DayOfWeek fireDay, int fireHour)
    {
        var local = ConvertToLocal(now, timezone);
        return local.DayOfWeek == fireDay && local.Hour == fireHour;
    }

    private static DateTime ConvertToLocal(DateTimeOffset now, string? timezone)
    {
        try
        {
            var tz = string.IsNullOrWhiteSpace(timezone)
                ? TimeZoneInfo.Utc
                : TimeZoneInfo.FindSystemTimeZoneById(timezone);
            return TimeZoneInfo.ConvertTime(now, tz).DateTime;
        }
        catch (TimeZoneNotFoundException)
        {
            return now.UtcDateTime;
        }
        catch (InvalidTimeZoneException)
        {
            return now.UtcDateTime;
        }
    }

    #region archive — async event-publish (disabled in MVP)
    // ProduceForCurrentHourAsync previously published NotificationCreated to the messaging outbox
    // with a per-user/week idempotency key. Consumers (2): NotificationCreatedHandler →
    // DispatchPushAsync; InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // The DB-level unique constraint on the notification preserves once-per-week semantics in place
    // of the outbox idempotency_key.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the per-user tx, after UpdateNotificationPayloadAsync:
    // // (WeekKey helper, removed from live code, builds an ISO-week string for the user's tz:
    // //   var local = ConvertToLocal(now, user.Timezone);
    // //   var iso = ISOWeek.GetYear(local); var week = ISOWeek.GetWeekOfYear(local);
    // //   return $"{iso:D4}-W{week:D2}";)
    // var idempotencyKey = $"weekly_summary:{user.UserId:N}:{weekKey}";
    // var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, user.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated, "notification", notificationId,
    //     payload, idempotencyKey, cancellationToken);
    #endregion
}
