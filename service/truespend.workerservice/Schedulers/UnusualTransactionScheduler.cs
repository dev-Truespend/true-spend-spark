using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class UnusualTransactionScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<UnusualTransactionScheduler> logger)
    : CronJobScheduler<UnusualTransactionJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.UnusualTransaction;

    protected override Task RunAsync(UnusualTransactionJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
