using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class InvalidDeviceTokenCleanupScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<InvalidDeviceTokenCleanupScheduler> logger)
    : CronJobScheduler<InvalidDeviceTokenCleanupJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.InvalidDeviceTokenCleanup;

    protected override Task RunAsync(InvalidDeviceTokenCleanupJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
