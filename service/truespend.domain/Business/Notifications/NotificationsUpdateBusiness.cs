using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Events.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsUpdateBusiness(
    INotificationsUpdateService updateService,
    INotificationsReadService readService,
    IMessagingInsertService messagingInsert,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    IUnitOfWork unitOfWork) : INotificationsUpdateBusiness
{
    private const string AllFilter = "all";

    public async Task<BusinessResponse<NotificationsResponse>> MarkReadAsync(
        OnboardingWorkflowUser user,
        int notificationId,
        CancellationToken cancellationToken)
    {
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.MarkReadAsync(user, notificationId, cancellationToken);
            var payload = JsonSerializer.Serialize(new NotificationReadEventContract(1, notificationId, user.UserId));
            await messagingInsert.EnqueueOutboxEventAsync(
                EventTypes.NotificationRead, "notification", notificationId,
                payload, $"notification.read.{notificationId}.{user.UserId}", cancellationToken);
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
            var payload = JsonSerializer.Serialize(new NotificationsReadAllEvent(user.UserId));
            await messagingInsert.EnqueueOutboxEventAsync(
                EventTypes.NotificationsReadAll, "user", null,
                payload, $"notifications.read_all.{user.UserId}.{DateTimeOffset.UtcNow:yyyyMMddHH}", cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        await inboxCacheInvalidator.InvalidateAsync(user.UserId, cancellationToken);
        var notifications = await readService.GetNotificationsAsync(user, AllFilter, cancellationToken);
        return BusinessResponse<NotificationsResponse>.Ok(new NotificationsResponse(notifications));
    }
}
