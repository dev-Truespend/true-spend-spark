using TrueSpend.Domain.BusinessInterfaces.NotificationSettings;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.NotificationSettings;

public sealed class NotificationSettingsReadBusiness(INotificationSettingsReadService service) : INotificationSettingsReadBusiness
{
    public async Task<BusinessResponse<NotificationSettingsResponse>> GetNotificationSettingsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        BusinessResponse<NotificationSettingsResponse>.Ok(await service.GetSettingsAsync(user, cancellationToken));

    public async Task<BusinessResponse<NotificationTypesResponse>> GetNotificationTypesAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var settings = await service.GetSettingsAsync(user, cancellationToken);
        return BusinessResponse<NotificationTypesResponse>.Ok(new NotificationTypesResponse(settings.Types));
    }
}
