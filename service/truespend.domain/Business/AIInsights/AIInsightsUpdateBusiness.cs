using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsUpdateBusiness(
    IAIInsightsReadService readService,
    IAIInsightsUpdateService updateService) : IAIInsightsUpdateBusiness
{
    public async Task<BusinessResponse<AIInsightsResponse>> DismissInsightAsync(
        OnboardingWorkflowUser user, int insightId, CancellationToken cancellationToken)
    {
        try
        {
            await updateService.DismissInsightAsync(insightId, user.UserId, cancellationToken);
        }
        catch (NotFoundAppException ex)
        {
            return BusinessResponse<AIInsightsResponse>.Fail([ex.Message], 404);
        }

        var insights = await readService.GetActiveInsightsAsync(user.UserId, cancellationToken);
        return BusinessResponse<AIInsightsResponse>.Ok(new AIInsightsResponse(insights));
    }
}
