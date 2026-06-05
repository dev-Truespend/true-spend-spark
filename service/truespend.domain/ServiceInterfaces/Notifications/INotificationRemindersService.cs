using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationRemindersService
{
    Task<NotificationReminder> CreateReminderAsync(OnboardingWorkflowUser user, CreateNotificationReminderRequest request, CancellationToken cancellationToken);
    Task DeleteReminderAsync(OnboardingWorkflowUser user, int reminderId, CancellationToken cancellationToken);
}
