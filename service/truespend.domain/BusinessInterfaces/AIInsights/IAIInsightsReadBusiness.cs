using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsReadBusiness
{
    Task<BusinessResponse<AIInsightsResponse>> GetInsightsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<AIInsightGenerationResponse>> GetGenerationRunAsync(OnboardingWorkflowUser user, int runId, CancellationToken cancellationToken);
}
