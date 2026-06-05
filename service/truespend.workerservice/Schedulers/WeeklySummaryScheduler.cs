using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class WeeklySummaryScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<WeeklySummaryScheduler> logger)
    : CronJobScheduler<WeeklySummaryJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.WeeklySummary;

    protected override Task RunAsync(WeeklySummaryJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
