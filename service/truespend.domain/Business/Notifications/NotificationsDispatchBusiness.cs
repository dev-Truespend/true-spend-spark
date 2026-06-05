using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsDispatchBusiness(
    INotificationDispatchService dispatchService,
    IPushDeliveryService pushDelivery,
    IEmailDeliveryService emailDelivery) : INotificationsDispatchBusiness
{
    public async Task<int> DispatchPushAsync(int notificationId, CancellationToken cancellationToken)
    {
        var input = await dispatchService.GetDispatchInputAsync(notificationId, cancellationToken);
        if (input is null) return 0;

        var pref = await dispatchService.GetPreferenceAsync(input.UserId, cancellationToken);
        var pushChannelId = await dispatchService.GetChannelIdAsync(NotificationsConstants.ChannelPush, cancellationToken);
        var emailChannelId = await dispatchService.GetChannelIdAsync(NotificationsConstants.ChannelEmail, cancellationToken);
        var sentStatusId = await dispatchService.GetDeliveryStatusIdAsync(NotificationsConstants.DeliveryStatusSent, cancellationToken);
        var failedStatusId = await dispatchService.GetDeliveryStatusIdAsync(NotificationsConstants.DeliveryStatusFailed, cancellationToken);
        var skippedStatusId = await dispatchService.GetDeliveryStatusIdAsync(NotificationsConstants.DeliveryStatusSkipped, cancellationToken);

        if (pref is null || !pref.MasterEnabled)
        {
            await dispatchService.InsertDeliveryAsync(notificationId, null, pushChannelId, skippedStatusId, null, "master_disabled", null, cancellationToken);
            return 0;
        }

        var userTz = await dispatchService.GetUserTimezoneAsync(input.UserId, cancellationToken);
        if (input.HonorsQuietHours && !QuietHours.IsOutsideQuietHours(pref, DateTimeOffset.UtcNow, userTz))
        {
            await dispatchService.InsertDeliveryAsync(notificationId, null, pushChannelId, skippedStatusId, null, "quiet_hours", null, cancellationToken);
            return 0;
        }

        int sent = 0;

        if (!pref.PushEnabled)
        {
            await dispatchService.InsertDeliveryAsync(notificationId, null, pushChannelId, skippedStatusId, null, "push_disabled", null, cancellationToken);
        }
        else
        {
            var targets = await dispatchService.GetActivePushTargetsAsync(input.UserId, cancellationToken);
            if (targets.Count == 0)
            {
                await dispatchService.InsertDeliveryAsync(notificationId, null, pushChannelId, skippedStatusId, null, "no_devices", null, cancellationToken);
            }
            else
            {
                foreach (var target in targets)
                {
                    var result = await pushDelivery.SendAsync(
                        new PushDeliveryRequest(target.PushToken, input.Title, input.Body, input.Payload),
                        cancellationToken);

                    var statusId = result.Success ? sentStatusId : failedStatusId;
                    await dispatchService.InsertDeliveryAsync(notificationId, target.DeviceId, pushChannelId, statusId, result.ExternalId, result.ErrorCode, result.ErrorMessage, cancellationToken);
                    if (result.Success) sent++;
                }
            }
        }

        if (pref.EmailEnabled)
        {
            var email = await dispatchService.GetUserEmailAsync(input.UserId, cancellationToken);
            if (string.IsNullOrWhiteSpace(email))
            {
                await dispatchService.InsertDeliveryAsync(notificationId, null, emailChannelId, skippedStatusId, null, "no_email", null, cancellationToken);
            }
            else
            {
                var emailResult = await emailDelivery.SendAsync(
                    new EmailDeliveryRequest(email, input.Title, BuildEmailBody(input)),
                    cancellationToken);

                var statusId = emailResult.Success ? sentStatusId : failedStatusId;
                await dispatchService.InsertDeliveryAsync(notificationId, null, emailChannelId, statusId, emailResult.ExternalId, emailResult.ErrorCode, emailResult.ErrorMessage, cancellationToken);
                if (emailResult.Success) sent++;
            }
        }

        return sent;
    }

    private static string BuildEmailBody(NotificationDispatchInput input) =>
        $"<p>{System.Net.WebUtility.HtmlEncode(input.Body)}</p>";
}
