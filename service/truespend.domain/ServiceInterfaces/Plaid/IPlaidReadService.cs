using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public interface IPlaidReadService
{
    Task<PlaidConnectionsResponse> GetConnectionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<PlaidConnection?> FindConnectionAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken);
    Task<PlaidConnectionCredentials?> GetConnectionCredentialsAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<PlaidActiveConnection>> GetActiveConnectionsAsync(CancellationToken cancellationToken);
}
