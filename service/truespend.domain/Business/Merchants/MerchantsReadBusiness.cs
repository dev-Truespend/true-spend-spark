using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;

namespace TrueSpend.Domain.Business.Merchants;

public sealed class MerchantsReadBusiness(IMerchantsReadService service) : IMerchantsReadBusiness
{
    public async Task<BusinessResponse<MerchantResponse>> GetMerchantAsync(int merchantId, CancellationToken cancellationToken)
    {
        var merchant = await service.GetMerchantAsync(merchantId, cancellationToken);
        return merchant is null
            ? BusinessResponse<MerchantResponse>.Fail(["Merchant not found."], 404)
            : BusinessResponse<MerchantResponse>.Ok(new MerchantResponse(merchant));
    }
}
