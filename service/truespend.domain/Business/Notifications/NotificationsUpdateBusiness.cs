using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsUpdateBusiness(
    INotificationsUpdateService updateService,
    INotificationsReadService readService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    IUnitOfWork unitOfWork) : INotificationsUpdateBusiness
{
    private const string AllFilter = "all";

    public async Task<BusinessResponse<NotificationsResponse>> MarkReadAsync(
        OnboardingWorkflowUser user,
        int notificationId,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.MarkReadAsync(user, notificationId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        await inboxCacheInvalidator.InvalidateAsync(user.UserId, cancellationToken);
        var notifications = await readService.GetNotificationsAsync(user, AllFilter, cancellationToken);
        return BusinessResponse<NotificationsResponse>.Ok(new NotificationsResponse(notifications));
    }

    public async Task<BusinessResponse<NotificationsResponse>> MarkAllReadAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.MarkAllReadAsync(user, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        await inboxCacheInvalidator.InvalidateAsync(user.UserId, cancellationToken);
        var notifications = await readService.GetNotificationsAsync(user, AllFilter, cancellationToken);
        return BusinessResponse<NotificationsResponse>.Ok(new NotificationsResponse(notifications));
    }

    #region archive — async event-publish (disabled in MVP)
    // MarkReadAsync previously published NotificationRead; MarkAllReadAsync published
    // NotificationsReadAll. Both handlers in truespend.eventconsumer were log-only, so no inline
    // replacement is needed. The inbox cache invalidation has always been an inline post-commit
    // call (kept).
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // MarkReadAsync — inside the committing tx, after MarkReadAsync:
    // var payload = JsonSerializer.Serialize(new NotificationReadEventContract(1, notificationId, user.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationRead, "notification", notificationId,
    //     payload, $"notification.read.{notificationId}.{user.UserId}", cancellationToken);
    //
    // // MarkAllReadAsync — inside the committing tx, after MarkAllReadAsync:
    // var payload = JsonSerializer.Serialize(new NotificationsReadAllEvent(user.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationsReadAll, "user", null,
    //     payload, $"notifications.read_all.{user.UserId}.{DateTimeOffset.UtcNow:yyyyMMddHH}", cancellationToken);
    #endregion
}
