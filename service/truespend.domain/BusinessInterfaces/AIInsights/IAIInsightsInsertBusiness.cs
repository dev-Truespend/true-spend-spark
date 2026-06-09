using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

// MVP: AI insight generation is worker-only (nightly AIInsightGenerationJob ->
// IAIInsightsGenerationBusiness.GenerateForAllEligibleUsersAsync). This user-triggered generation
// path is retained for future re-enable but is no longer exposed via the API
// (see the archive region in AIInsightsController).
public interface IAIInsightsInsertBusiness
{
    Task<BusinessResponse<AIInsightGenerationResponse>> GenerateInsightsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
