using Microsoft.Extensions.Options;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Schedulers;

public abstract class CronJobScheduler<TJob>(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<WorkerConfig> options,
    ILogger logger) : BackgroundService where TJob : class
{
    protected abstract JobConfig GetConfig(WorkerConfig worker);
    protected abstract Task RunAsync(TJob job, CancellationToken cancellationToken);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cfg = GetConfig(options.CurrentValue);
        if (!cfg.Enabled)
        {
            logger.LogInformation("{Job} is disabled by config; scheduler exiting.", typeof(TJob).Name);
            return;
        }

        CronExpression cron;
        try
        {
            cron = CronExpression.Parse(cfg.Cron);
        }
        catch (ArgumentException ex)
        {
            logger.LogError(ex, "{Job} cron expression invalid ('{Cron}'); scheduler exiting.", typeof(TJob).Name, cfg.Cron);
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.UtcNow;
            var next = cron.GetNextOccurrence(now);
            var delay = next - now;
            if (delay > TimeSpan.Zero)
            {
                try { await Task.Delay(delay, stoppingToken); }
                catch (OperationCanceledException) { return; }
            }
            await RunOnceWithRetryAsync(cfg, stoppingToken);
        }
    }

    private async Task RunOnceWithRetryAsync(JobConfig cfg, CancellationToken stoppingToken)
    {
        var attempt = 0;
        var initial = TimeSpan.FromSeconds(Math.Max(1, cfg.InitialBackoffSeconds));
        var max = TimeSpan.FromSeconds(Math.Max(cfg.InitialBackoffSeconds, cfg.MaxBackoffSeconds));
        var backoff = initial;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var lockService = scope.ServiceProvider.GetRequiredService<IDistributedLockService>();
                await using var handle = await lockService.TryAcquireAsync(typeof(TJob).Name, stoppingToken);
                if (handle is null)
                {
                    logger.LogInformation("{Job} skipped: lock already held by another worker instance.", typeof(TJob).Name);
                    return;
                }

                var job = scope.ServiceProvider.GetRequiredService<TJob>();
                await RunAsync(job, stoppingToken);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex)
            {
                attempt++;
                if (attempt > cfg.MaxRetries)
                {
                    logger.LogError(ex, "{Job} failed after {Attempts} attempts; waiting for next cron tick.", typeof(TJob).Name, attempt);
                    return;
                }
                logger.LogWarning(ex, "{Job} attempt {Attempt} failed; retrying in {DelaySeconds}s.", typeof(TJob).Name, attempt, (int)backoff.TotalSeconds);
                try { await Task.Delay(backoff, stoppingToken); }
                catch (OperationCanceledException) { return; }
                var nextTicks = Math.Min(backoff.Ticks * 2, max.Ticks);
                backoff = TimeSpan.FromTicks(nextTicks);
            }
        }
    }
}
