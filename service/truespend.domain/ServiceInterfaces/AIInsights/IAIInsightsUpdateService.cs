namespace TrueSpend.Domain.ServiceInterfaces.AIInsights;

public interface IAIInsightsUpdateService
{
    Task DismissInsightAsync(int insightId, Guid userId, CancellationToken cancellationToken);
    Task MarkRunInProgressAsync(int runId, CancellationToken cancellationToken);
    Task MarkRunSucceededAsync(int runId, int insightsCreated, CancellationToken cancellationToken);
    Task MarkRunFailedAsync(int runId, string errorMessage, CancellationToken cancellationToken);
}
