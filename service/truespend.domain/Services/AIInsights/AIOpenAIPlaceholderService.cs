using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;

namespace TrueSpend.Domain.Services.AIInsights;

public sealed class AIOpenAIPlaceholderService : IAIOpenAIService
{
    public Task<IReadOnlyList<GeneratedInsight>> GenerateInsightsAsync(Guid userId, CancellationToken cancellationToken)
    {
        IReadOnlyList<GeneratedInsight> results =
        [
            new GeneratedInsight("reward_optimization", "high",
                "Use your best card for groceries",
                "You could earn more rewards by using your highest-rate grocery card for supermarket purchases.")
        ];
        return Task.FromResult(results);
    }
}
