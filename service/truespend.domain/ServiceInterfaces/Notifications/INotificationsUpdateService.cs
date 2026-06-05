using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationsUpdateService
{
    Task MarkReadAsync(OnboardingWorkflowUser user, int notificationId, CancellationToken cancellationToken);
    Task MarkAllReadAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
