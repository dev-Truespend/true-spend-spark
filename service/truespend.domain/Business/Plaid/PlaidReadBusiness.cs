using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidReadBusiness(IPlaidReadService service) : IPlaidReadBusiness
{
    public async Task<BusinessResponse<PlaidConnectionsResponse>> GetConnectionsAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var result = await service.GetConnectionsAsync(user, cancellationToken);
        return BusinessResponse<PlaidConnectionsResponse>.Ok(result);
    }
}
