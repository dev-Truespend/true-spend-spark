using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

// Replaces the three per-step schedulers (issuer, card product, reward rule) and the mapping
// review scheduler. job-architecture.md requires the catalog trio run in order (issuer → product
// → rule) and CardCatalogMappingReviewJob chained after; this orchestrator enforces both.
public sealed class RewardsCcCatalogSyncScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<RewardsCcCatalogSyncScheduler> logger)
    : CronJobScheduler<RewardsCcCatalogSyncOrchestrationJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.RewardsCcCatalogSync;

    protected override Task RunAsync(RewardsCcCatalogSyncOrchestrationJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
