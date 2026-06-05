using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class RewardsCcCatalogReconcileScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<RewardsCcCatalogReconcileScheduler> logger)
    : CronJobScheduler<RewardsCcCatalogReconcileJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.RewardsCcCatalogReconcile;

    protected override Task RunAsync(RewardsCcCatalogReconcileJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
