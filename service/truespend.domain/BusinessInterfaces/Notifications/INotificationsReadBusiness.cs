using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationsReadBusiness
{
    Task<BusinessResponse<NotificationsResponse>> GetNotificationsAsync(OnboardingWorkflowUser user, string filter, CancellationToken cancellationToken);
    Task<BusinessResponse<NotificationDetailResponse>> GetNotificationDetailAsync(OnboardingWorkflowUser user, int notificationId, CancellationToken cancellationToken);
    Task<BusinessResponse<NotificationRemindersResponse>> GetRemindersAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
