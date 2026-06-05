using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsReadBusiness(IAIInsightsReadService service, IEntitlementGuard entitlementGuard) : IAIInsightsReadBusiness
{
    public async Task<BusinessResponse<AIInsightsResponse>> GetInsightsAsync(
        OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.AiInsightsEnabledFeatureCode, cancellationToken);

        if (!await service.PersonalizedInsightsEnabledAsync(user.UserId, cancellationToken))
            return BusinessResponse<AIInsightsResponse>.Ok(new AIInsightsResponse([]));

        var insights = await service.GetActiveInsightsAsync(user.UserId, cancellationToken);
        return BusinessResponse<AIInsightsResponse>.Ok(new AIInsightsResponse(insights));
    }

    public async Task<BusinessResponse<AIInsightGenerationResponse>> GetGenerationRunAsync(
        OnboardingWorkflowUser user, int runId, CancellationToken cancellationToken)
    {
        var run = await service.GetRunAsync(runId, cancellationToken);

        if (run is null || run.UserId != user.UserId)
            return BusinessResponse<AIInsightGenerationResponse>.Fail(
                [ExceptionMessages.AIInsightGenerationRunNotFound], 404);

        return BusinessResponse<AIInsightGenerationResponse>.Ok(
            new AIInsightGenerationResponse(run.Id, run.StatusCode));
    }
}
