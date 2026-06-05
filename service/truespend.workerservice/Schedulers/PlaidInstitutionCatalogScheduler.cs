using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class PlaidInstitutionCatalogScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<PlaidInstitutionCatalogScheduler> logger)
    : CronJobScheduler<PlaidInstitutionCatalogJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.PlaidInstitutionCatalog;

    protected override Task RunAsync(PlaidInstitutionCatalogJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
