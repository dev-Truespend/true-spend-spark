using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Analytics;

public interface IAnalyticsReadBusiness
{
    Task<BusinessResponse<RewardsSummaryResponse>> GetRewardsSummaryAsync(OnboardingWorkflowUser user, AnalyticsPeriodRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<MissedRewardsSummaryResponse>> GetMissedRewardsSummaryAsync(OnboardingWorkflowUser user, AnalyticsPeriodRequest request, CancellationToken cancellationToken);
}
