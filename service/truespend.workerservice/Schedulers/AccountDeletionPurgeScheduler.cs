using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class AccountDeletionPurgeScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<AccountDeletionPurgeScheduler> logger)
    : CronJobScheduler<AccountDeletionPurgeJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.AccountDeletionPurge;

    protected override Task RunAsync(AccountDeletionPurgeJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
