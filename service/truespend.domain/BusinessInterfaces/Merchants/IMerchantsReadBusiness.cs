using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.BusinessInterfaces.Merchants;

public interface IMerchantsReadBusiness
{
    Task<BusinessResponse<MerchantResponse>> GetMerchantAsync(int merchantId, CancellationToken cancellationToken);
}
