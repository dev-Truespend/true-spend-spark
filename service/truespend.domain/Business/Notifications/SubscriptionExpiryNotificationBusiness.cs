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

// Cron-driven producer: reminds users before a free trial or a cancel-at-period-end plan ends.
// One reminder per whole-day mark (2 days before, 1 day before). Idempotent within a UTC day —
// a user can be at most one whole-day mark from expiry on any given day, so "one expiry
// notification per user per UTC day" prevents duplicates across same-day re-runs and retries.
public sealed class SubscriptionExpiryNotificationBusiness(
    INotificationProductionService productionService,
    INotificationGateService gateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    ILogger<SubscriptionExpiryNotificationBusiness> logger) : ISubscriptionExpiryNotificationBusiness
{
    public async Task<int> ProduceExpiringAsync(DateTimeOffset now, int windowDays, CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var typeId = await productionService.GetNotificationTypeIdAsync(NotificationsConstants.SubscriptionExpiryTypeCode, cancellationToken);
        if (typeId == 0) return 0;

        var windowEnd = now.AddDays(windowDays);
        var candidates = await productionService.GetExpiringSubscriptionsAsync(now, windowEnd, cancellationToken);
        if (candidates.Count == 0) return 0;

        var dayStartUtc = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);

        var gates = await gateService.GetGatesAsync(
            candidates.Select(c => c.UserId).Distinct().ToList(), typeId, now, cancellationToken);

        int produced = 0;
        foreach (var candidate in candidates)
        {
            var daysBefore = (int)Math.Ceiling((candidate.ExpiresAt - now).TotalDays);
            if (daysBefore < 1 || daysBefore > windowDays) continue;

            if (!gates.TryGetValue(candidate.UserId, out var gate) || !gate.ShouldProduce()) continue;

            // One expiry reminder per user per UTC day (covers same-day re-runs and the 2d/1d marks).
            if (await productionService.HasNotificationOfTypeSinceAsync(candidate.UserId, typeId, dayStartUtc, cancellationToken))
                continue;

            var (title, body) = BuildContent(candidate.Kind, daysBefore);

            int notificationId = 0;
            bool committed = false;
            await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    notificationId = await productionService.InsertNotificationAsync(
                        new NotificationToProduce(candidate.UserId, typeId, title, body, null, null, null),
                        cancellationToken);

                    await productionService.UpdateNotificationPayloadAsync(
                        notificationId,
                        PushPayloadBuilder.SubscriptionExpiry(notificationId, candidate.Kind, daysBefore, candidate.ExpiresAt),
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
                logger.LogWarning(ex, "Push dispatch failed for subscription-expiry notification {NotificationId}", notificationId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(candidate.UserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after subscription-expiry notification {NotificationId}", candidate.UserId, notificationId);
            }
        }

        return produced;
    }

    private static (string Title, string Body) BuildContent(string kind, int daysBefore)
    {
        var subject = kind == NotificationsConstants.SubscriptionExpiryTrialKind ? "free trial" : "plan";
        var when = daysBefore <= 1 ? "tomorrow" : $"in {daysBefore} days";
        var title = $"Your {subject} ends {when}";
        var body = kind == NotificationsConstants.SubscriptionExpiryTrialKind
            ? "Upgrade now to keep your cards, recommendations, and insights."
            : "Renew to keep your cards, recommendations, and insights.";
        return (title, body);
    }

    #region archive — async event-publish (disabled in MVP)
    // ProduceExpiringAsync would publish NotificationCreated to the messaging outbox with a
    // per-user/day idempotency key. Consumers (2): NotificationCreatedHandler → DispatchPushAsync;
    // InboxCacheInvalidatorHandler → InvalidateAsync. Both now run inline post-commit.
    // HasNotificationOfTypeSinceAsync (one-per-UTC-day) replaces the outbox idempotency_key.
    #endregion
}
