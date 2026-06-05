using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.BusinessInterfaces.Merchants;

public interface IMerchantsInsertBusiness
{
    Task<BusinessResponse<MerchantResponse>> ResolveMerchantAsync(
        OnboardingWorkflowUser user,
        ResolveMerchantRequest request,
        CancellationToken cancellationToken);

    Task<BusinessResponse<MerchantVisitsResponse>> CreateVisitAsync(
        OnboardingWorkflowUser user,
        CreateMerchantVisitRequest request,
        CancellationToken cancellationToken);
}
