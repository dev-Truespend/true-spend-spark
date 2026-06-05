using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsInsertBusiness
{
    Task<BusinessResponse<AIInsightGenerationResponse>> GenerateInsightsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
