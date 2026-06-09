using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.ServiceInterfaces.Merchants;

public interface IMerchantsReadService
{
    Task<Merchant?> GetMerchantAsync(int merchantId, CancellationToken cancellationToken);
    Task<Merchant?> FindByNameAsync(string name, CancellationToken cancellationToken);
    Task<MerchantCategoryMatch> ResolveCategoryAsync(string merchantName, CancellationToken cancellationToken);
    Task<RecentMerchantVisit?> GetMostRecentVisitAsync(OnboardingWorkflowUser user, TimeSpan lookback, CancellationToken cancellationToken);
}
