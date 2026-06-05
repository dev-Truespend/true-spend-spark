using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class PlaidTransactionSyncScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<PlaidTransactionSyncScheduler> logger)
    : CronJobScheduler<PlaidTransactionSyncJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.PlaidTransactionSync;

    protected override Task RunAsync(PlaidTransactionSyncJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
