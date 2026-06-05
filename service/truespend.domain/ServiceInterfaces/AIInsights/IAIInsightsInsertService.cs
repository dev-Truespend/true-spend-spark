using TrueSpend.Domain.Models.AIInsights;

namespace TrueSpend.Domain.ServiceInterfaces.AIInsights;

public interface IAIInsightsInsertService
{
    Task<InsightGenerationRun> CreateGenerationRunAsync(Guid userId, CancellationToken cancellationToken);
    Task InsertInsightsAsync(int runId, Guid userId, IReadOnlyList<GeneratedInsight> insights, CancellationToken cancellationToken);
}
