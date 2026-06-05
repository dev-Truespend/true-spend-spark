using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.NotificationSettings;

public interface INotificationSettingsUpdateService
{
    Task<NotificationSettingsResponse> SaveSettingsAsync(
        OnboardingWorkflowUser user,
        NotificationSettingsResponse settings,
        CancellationToken cancellationToken);

    Task<NotificationSettingsResponse> SaveTypePreferenceAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationTypePreferenceRequest request,
        CancellationToken cancellationToken);
}
