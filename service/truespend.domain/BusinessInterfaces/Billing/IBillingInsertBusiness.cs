using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IBillingInsertBusiness
{
    Task<BusinessResponse<HostedBillingResponse>> CreateCheckoutAsync(
        OnboardingWorkflowUser user,
        CreateCheckoutSessionRequest request,
        CancellationToken cancellationToken);

    Task<BusinessResponse<HostedBillingResponse>> CreatePortalAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken);
}
