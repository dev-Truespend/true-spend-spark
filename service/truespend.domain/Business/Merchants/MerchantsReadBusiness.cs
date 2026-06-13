using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;

namespace TrueSpend.Domain.Business.Merchants;

public sealed class MerchantsReadBusiness(IMerchantsReadService service) : IMerchantsReadBusiness
{
    private const int DefaultRecentVisitsLimit = 3;
    private const int MaxRecentVisitsLimit = 10;
    private static readonly TimeSpan RecentVisitWindow = TimeSpan.FromDays(30);

    public async Task<BusinessResponse<MerchantResponse>> GetMerchantAsync(int merchantId, CancellationToken cancellationToken)
    {
        var merchant = await service.GetMerchantAsync(merchantId, cancellationToken);
        return merchant is null
            ? BusinessResponse<MerchantResponse>.Fail(["Merchant not found."], 404)
            : BusinessResponse<MerchantResponse>.Ok(new MerchantResponse(merchant));
    }

    public async Task<BusinessResponse<IReadOnlyList<RecentMerchantVisit>>> GetRecentVisitsAsync(OnboardingWorkflowUser user, int? limit, CancellationToken cancellationToken)
    {
        var resolved = limit is null or <= 0 ? DefaultRecentVisitsLimit : Math.Min(limit.Value, MaxRecentVisitsLimit);
        var visits = await service.GetRecentVisitsAsync(user, RecentVisitWindow, resolved, cancellationToken);
        return BusinessResponse<IReadOnlyList<RecentMerchantVisit>>.Ok(visits);
    }
}
