using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsInsertBusiness(
    IAIInsightsReadService readService,
    IAIInsightsInsertService insertService,
    IEntitlementGuard entitlementGuard) : IAIInsightsInsertBusiness
{
    public async Task<BusinessResponse<AIInsightGenerationResponse>> GenerateInsightsAsync(
        OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.AiInsightsEnabledFeatureCode, cancellationToken);

        if (!await readService.PersonalizedInsightsEnabledAsync(user.UserId, cancellationToken))
            return BusinessResponse<AIInsightGenerationResponse>.Fail(
                [ExceptionMessages.AIInsightsPrivacyDisabled], 403);

        var run = await insertService.CreateGenerationRunAsync(user.UserId, cancellationToken);
        return BusinessResponse<AIInsightGenerationResponse>.Ok(
            new AIInsightGenerationResponse(run.Id, run.StatusCode), 202);
    }
}
