using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.NotificationSettings;

public interface INotificationSettingsUpdateBusiness
{
    Task<BusinessResponse<NotificationSettingsResponse>> UpdateNotificationSettingsAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken);

    Task<BusinessResponse<NotificationSettingsResponse>> UpdateNotificationTypePreferenceAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationTypePreferenceRequest request,
        CancellationToken cancellationToken);
}
