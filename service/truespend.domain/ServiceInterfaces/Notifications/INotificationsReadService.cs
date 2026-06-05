using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationsReadService
{
    Task<IReadOnlyList<Notification>> GetNotificationsAsync(OnboardingWorkflowUser user, string filter, CancellationToken cancellationToken);
    Task<NotificationDetail?> GetNotificationDetailAsync(OnboardingWorkflowUser user, int notificationId, CancellationToken cancellationToken);
    Task<IReadOnlyList<NotificationReminder>> GetRemindersAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
