using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Jobs;

public sealed class AccountDeletionPurgeJob(
    IAccountDeletionPurgeBusiness business,
    IOptionsMonitor<WorkerConfig> options)
{
    public Task RunAsync(CancellationToken cancellationToken)
    {
        var cfg = options.CurrentValue.AccountDeletionPurge;
        return business.PurgeDueAccountsAsync(DateTimeOffset.UtcNow, cfg.BatchSize, cancellationToken);
    }
}
