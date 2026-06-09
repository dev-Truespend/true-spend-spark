using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class SubscriptionExpiryNotificationScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<SubscriptionExpiryNotificationScheduler> logger)
    : CronJobScheduler<SubscriptionExpiryNotificationJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.SubscriptionExpiry;

    protected override Task RunAsync(SubscriptionExpiryNotificationJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
