using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Onboarding;

public interface IOnboardingReadBusiness
{
    Task<BusinessResponse<OnboardingResponse>> GetOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
