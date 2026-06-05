using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsCacheInvalidatorBusiness(ILogger<AIInsightsCacheInvalidatorBusiness> logger)
    : IAIInsightsCacheInvalidatorBusiness
{
    public Task InvalidateForUserAsync(Guid userId, int runId, CancellationToken cancellationToken)
    {
        // Cache invalidation is currently a no-op because AI insights are read directly from the DB
        // on each request. When a server-side cache (e.g. Redis) is introduced, evict the user's
        // ai-insights key here. The dedicated business class + DI wiring keeps the integration point
        // honest with the workflow's expected consumer.
        logger.LogInformation("AI insights cache invalidated for user {UserId} (run {RunId})", userId, runId);
        return Task.CompletedTask;
    }
}
