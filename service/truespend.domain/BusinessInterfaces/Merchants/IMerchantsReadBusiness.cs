using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.BusinessInterfaces.Merchants;

public interface IMerchantsReadBusiness
{
    Task<BusinessResponse<MerchantResponse>> GetMerchantAsync(int merchantId, CancellationToken cancellationToken);
    Task<BusinessResponse<IReadOnlyList<RecentMerchantVisit>>> GetRecentVisitsAsync(OnboardingWorkflowUser user, int? limit, CancellationToken cancellationToken);
}
