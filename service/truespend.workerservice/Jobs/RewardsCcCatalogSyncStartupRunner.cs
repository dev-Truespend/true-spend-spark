namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcCatalogSyncStartupRunner(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<RewardsCcCatalogSyncStartupRunner> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!configuration.GetValue<bool>("RewardsCc:RunOnStartup")) return;
        logger.LogInformation("RewardsCc:RunOnStartup=true — running RewardsCcCatalogSyncOrchestrationJob once.");
        await using var scope = scopeFactory.CreateAsyncScope();
        var job = scope.ServiceProvider.GetRequiredService<RewardsCcCatalogSyncOrchestrationJob>();
        try
        {
            await job.RunAsync(cancellationToken);
            logger.LogInformation("RewardsCcCatalogSyncOrchestrationJob startup run finished.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RewardsCcCatalogSyncOrchestrationJob startup run failed.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
