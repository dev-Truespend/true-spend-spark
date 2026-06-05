using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationRemindersBusiness
{
    Task<BusinessResponse<NotificationRemindersResponse>> CreateReminderAsync(OnboardingWorkflowUser user, CreateNotificationReminderRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<NotificationRemindersResponse>> DeleteReminderAsync(OnboardingWorkflowUser user, int reminderId, CancellationToken cancellationToken);
}
