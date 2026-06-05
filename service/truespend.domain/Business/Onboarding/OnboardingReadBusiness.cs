using TrueSpend.Domain.BusinessInterfaces.Onboarding;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;

namespace TrueSpend.Domain.Business.Onboarding;

public sealed class OnboardingReadBusiness(IOnboardingReadService service) : IOnboardingReadBusiness
{
    public async Task<BusinessResponse<OnboardingResponse>> GetOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        BusinessResponse<OnboardingResponse>.Ok(await service.GetOnboardingAsync(user, cancellationToken));
}
