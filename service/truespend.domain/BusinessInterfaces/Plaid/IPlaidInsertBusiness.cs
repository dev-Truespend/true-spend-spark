using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public interface IPlaidInsertBusiness
{
    Task<BusinessResponse<PlaidLinkTokenResponse>> CreatePlaidLinkTokenAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<PlaidConnectionResponse>> ExchangePlaidTokenAsync(
        OnboardingWorkflowUser user,
        ExchangePlaidTokenRequest request,
        CancellationToken cancellationToken);
}
