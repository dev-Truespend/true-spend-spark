using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationRemindersBusiness(
    INotificationRemindersService service,
    INotificationsReadService readService,
    NotificationsValidator validator) : INotificationRemindersBusiness
{
    public async Task<BusinessResponse<NotificationRemindersResponse>> CreateReminderAsync(
        OnboardingWorkflowUser user,
        CreateNotificationReminderRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCreateReminder(request);
        if (errors.Count > 0)
            return BusinessResponse<NotificationRemindersResponse>.Fail(errors, 400);

        await service.CreateReminderAsync(user, request, cancellationToken);
        var reminders = await readService.GetRemindersAsync(user, cancellationToken);
        return BusinessResponse<NotificationRemindersResponse>.Ok(new NotificationRemindersResponse(reminders));
    }

    public async Task<BusinessResponse<NotificationRemindersResponse>> DeleteReminderAsync(
        OnboardingWorkflowUser user,
        int reminderId,
        CancellationToken cancellationToken)
    {
        await service.DeleteReminderAsync(user, reminderId, cancellationToken);
        var reminders = await readService.GetRemindersAsync(user, cancellationToken);
        return BusinessResponse<NotificationRemindersResponse>.Ok(new NotificationRemindersResponse(reminders));
    }
}
