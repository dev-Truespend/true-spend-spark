namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsCacheInvalidatorBusiness
{
    Task InvalidateForUserAsync(Guid userId, int runId, CancellationToken cancellationToken);
}
