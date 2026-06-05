using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class AdminNotificationDispatchScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<AdminNotificationDispatchScheduler> logger)
    : CronJobScheduler<AdminNotificationDispatchJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.AdminNotificationDispatch;

    protected override Task RunAsync(AdminNotificationDispatchJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
