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

public sealed class WeeklySummaryNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : IWeeklySummaryNotificationBusiness
{
    public async Task<int> ProduceForCurrentHourAsync(
        DateTimeOffset now,
        DayOfWeek fireDay,
        int fireHour,
        CancellationToken cancellationToken)
    {
        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.WeeklySummaryTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var users = await productionService.GetActiveUsersWithTimezoneAsync(cancellationToken);
        if (users.Count == 0) return 0;

        int produced = 0;
        foreach (var user in users)
        {
            if (!IsFiringHour(now, user.Timezone, fireDay, fireHour)) continue;

            var weekKey = WeekKey(now, user.Timezone);
            var idempotencyKey = $"weekly_summary:{user.UserId:N}:{weekKey}";

            var gate = await gateService.GetGateAsync(user.UserId, typeId, now, cancellationToken);
            if (!gate.ShouldProduce()) continue;

            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var notificationId = await productionService.InsertNotificationAsync(
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

                var payload = JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, user.UserId));
                await messagingInsert.EnqueueOutboxEventAsync(
                    EventTypes.NotificationCreated,
                    "notification",
                    notificationId,
                    payload,
                    idempotencyKey,
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

    private static bool IsFiringHour(DateTimeOffset now, string? timezone, DayOfWeek fireDay, int fireHour)
    {
        var local = ConvertToLocal(now, timezone);
        return local.DayOfWeek == fireDay && local.Hour == fireHour;
    }

    private static string WeekKey(DateTimeOffset now, string? timezone)
    {
        var local = ConvertToLocal(now, timezone);
        var iso = ISOWeek.GetYear(local);
        var week = ISOWeek.GetWeekOfYear(local);
        return $"{iso:D4}-W{week:D2}";
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

}
