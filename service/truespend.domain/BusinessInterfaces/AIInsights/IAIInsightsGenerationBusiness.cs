namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsGenerationBusiness
{
    Task ProcessPendingRunsAsync(CancellationToken cancellationToken);
}
