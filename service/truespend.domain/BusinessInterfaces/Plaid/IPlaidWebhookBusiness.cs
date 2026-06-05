using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public interface IPlaidWebhookBusiness
{
    Task<BusinessResponse<PlaidWebhookResult>> HandleEventAsync(PlaidWebhookInput input, CancellationToken cancellationToken);
}
