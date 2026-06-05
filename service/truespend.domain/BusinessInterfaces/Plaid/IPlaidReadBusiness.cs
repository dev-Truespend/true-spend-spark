using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public interface IPlaidReadBusiness
{
    Task<BusinessResponse<PlaidConnectionsResponse>> GetConnectionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
