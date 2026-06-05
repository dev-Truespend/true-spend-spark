using TrueSpend.Domain.BusinessInterfaces.Plaid;

namespace TrueSpend.WorkerService.Jobs;

public sealed class PlaidTransactionSyncJob(IPlaidUpdateBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncAllActiveConnectionsAsync(cancellationToken);
}
