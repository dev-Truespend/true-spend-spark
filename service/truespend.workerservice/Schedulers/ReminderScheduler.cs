using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class ReminderScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<ReminderScheduler> logger)
    : CronJobScheduler<ReminderFiringJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.ReminderFiring;

    protected override Task RunAsync(ReminderFiringJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
