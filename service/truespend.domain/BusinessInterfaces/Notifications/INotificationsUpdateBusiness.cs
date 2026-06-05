using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationsUpdateBusiness
{
    Task<BusinessResponse<NotificationsResponse>> MarkReadAsync(OnboardingWorkflowUser user, int notificationId, CancellationToken cancellationToken);
    Task<BusinessResponse<NotificationsResponse>> MarkAllReadAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
