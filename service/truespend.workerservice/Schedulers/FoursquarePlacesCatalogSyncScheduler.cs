using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class FoursquarePlacesCatalogSyncScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<FoursquarePlacesCatalogSyncScheduler> logger)
    : CronJobScheduler<FoursquarePlacesCatalogSyncJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.FoursquarePlacesCatalogSync;

    protected override Task RunAsync(FoursquarePlacesCatalogSyncJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
