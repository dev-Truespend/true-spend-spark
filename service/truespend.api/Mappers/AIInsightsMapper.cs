using TrueSpend.Api.ViewModels.AIInsights;
using TrueSpend.Domain.Models.AIInsights;

namespace TrueSpend.Api.Mappers;

public interface IAIInsightsMapper
{
    AIInsightsResponseVm ToInsightsResponse(AIInsightsResponse domain);
    AIInsightGenerationResponseVm ToGenerationResponse(AIInsightGenerationResponse domain);
}

public sealed class AIInsightsMapper : IAIInsightsMapper
{
    public AIInsightsResponseVm ToInsightsResponse(AIInsightsResponse domain) =>
        new(domain.Insights.Select(ToInsight).ToArray());

    public AIInsightGenerationResponseVm ToGenerationResponse(AIInsightGenerationResponse domain) =>
        new(domain.RunId, domain.Status);

    private static AIInsightVm ToInsight(AIInsight domain) =>
        new(domain.Id, domain.TypeCode, domain.Priority, domain.Title, domain.Body, domain.GeneratedAt);
}
