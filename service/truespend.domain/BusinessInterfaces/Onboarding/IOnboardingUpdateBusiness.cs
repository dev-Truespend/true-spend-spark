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

public interface IOnboardingUpdateBusiness
{
    Task<BusinessResponse<OnboardingResponse>> UpdateOnboardingAsync(OnboardingWorkflowUser user, UpdateOnboardingRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<OnboardingResponse>> SkipCardLinkingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<OnboardingResponse>> CompleteOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
