using Microsoft.Extensions.Options;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Schedulers;

public sealed class PersonalPlaceDetectionScheduler(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger<PersonalPlaceDetectionScheduler> logger)
    : CronJobScheduler<PersonalPlaceDetectionJob>(scopeFactory, options, logger)
{
    protected override JobConfig GetConfig(WorkerConfig worker) => worker.PersonalPlaceDetection;

    protected override Task RunAsync(PersonalPlaceDetectionJob job, CancellationToken cancellationToken) =>
        job.RunAsync(cancellationToken);
}
