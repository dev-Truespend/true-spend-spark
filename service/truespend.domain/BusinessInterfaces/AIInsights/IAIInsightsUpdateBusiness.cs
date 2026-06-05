using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsUpdateBusiness
{
    Task<BusinessResponse<AIInsightsResponse>> DismissInsightAsync(OnboardingWorkflowUser user, int insightId, CancellationToken cancellationToken);
}
