using TrueSpend.Domain.Models.AIInsights;

namespace TrueSpend.Domain.ServiceInterfaces.AIInsights;

public interface IAIOpenAIService
{
    Task<IReadOnlyList<GeneratedInsight>> GenerateInsightsAsync(Guid userId, CancellationToken cancellationToken);
}
