using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

// Phase 1 implementation: polls insights.insight_generation_runs from the database on a cron tick.
// When Azure Service Bus is wired into the worker, swap this scheduler for a queue listener
// per job-architecture.md §AIInsightGenerationJob.
public sealed class AIInsightGenerationScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<AIInsightGenerationScheduler> logger)
    : CronJobScheduler<AIInsightGenerationJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.AIInsightGeneration;

    protected override Task RunAsync(AIInsightGenerationJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
