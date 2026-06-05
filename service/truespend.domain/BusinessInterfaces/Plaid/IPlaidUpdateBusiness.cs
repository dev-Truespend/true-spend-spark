using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public interface IPlaidUpdateBusiness
{
    Task<BusinessResponse<PlaidConnectionResponse>> SyncConnectionAsync(OnboardingWorkflowUser user, SyncPlaidConnectionRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<PlaidLinkTokenResponse>> ReconnectConnectionAsync(OnboardingWorkflowUser user, ReconnectPlaidConnectionRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<PlaidConnectionResponse>> DisconnectConnectionAsync(OnboardingWorkflowUser user, DisconnectPlaidConnectionRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<PlaidTransactionSyncResponse>> SyncPlaidTransactionsAsync(OnboardingWorkflowUser user, SyncPlaidTransactionsRequest request, CancellationToken cancellationToken);
    Task SyncAllActiveConnectionsAsync(CancellationToken cancellationToken);
}
