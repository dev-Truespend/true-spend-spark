using TrueSpend.Domain.Models.AIInsights;

namespace TrueSpend.Domain.ServiceInterfaces.AIInsights;

public interface IAIInsightsReadService
{
    Task<IReadOnlyList<AIInsight>> GetActiveInsightsAsync(Guid userId, CancellationToken cancellationToken);
    Task<InsightGenerationRun?> GetRunAsync(int runId, CancellationToken cancellationToken);
    Task<IReadOnlyList<InsightGenerationRun>> GetPendingRunsAsync(CancellationToken cancellationToken);
    Task<bool> PersonalizedInsightsEnabledAsync(Guid userId, CancellationToken cancellationToken);
    Task<string> GetUserPlanCodeAsync(Guid userId, CancellationToken cancellationToken);
}
