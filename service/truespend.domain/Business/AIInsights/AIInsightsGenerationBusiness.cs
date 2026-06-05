using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Insights;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsGenerationBusiness(
    IAIInsightsReadService readService,
    IAIInsightsInsertService insertService,
    IAIInsightsUpdateService updateService,
    IAIOpenAIService openAIService,
    IMessagingInsertService messagingInsert,
    IEntitlementGuard entitlementGuard,
    IUnitOfWork unitOfWork) : IAIInsightsGenerationBusiness
{
    public async Task ProcessPendingRunsAsync(CancellationToken cancellationToken)
    {
        var pendingRuns = await readService.GetPendingRunsAsync(cancellationToken);
        foreach (var run in pendingRuns)
            await ProcessRunAsync(run, cancellationToken);
    }

    private async Task ProcessRunAsync(InsightGenerationRun run, CancellationToken cancellationToken)
    {
        try
        {
            // Workflow 13: re-check entitlement at run time in case subscription state changed since insert.
            try
            {
                await entitlementGuard.RequireFeatureAsync(new OnboardingWorkflowUser(run.UserId, null), BillingConstants.AiInsightsEnabledFeatureCode, cancellationToken);
            }
            catch (EntitlementRequiredAppException ex)
            {
                await updateService.MarkRunFailedAsync(run.Id, ex.Message, cancellationToken);
                return;
            }

            await updateService.MarkRunInProgressAsync(run.Id, cancellationToken);
            var insights = await openAIService.GenerateInsightsAsync(run.UserId, cancellationToken);

            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            await insertService.InsertInsightsAsync(run.Id, run.UserId, insights, cancellationToken);
            await updateService.MarkRunSucceededAsync(run.Id, insights.Count, cancellationToken);
            var payload = JsonSerializer.Serialize(new AIGenerationCompletedEventContract(run.Id, run.UserId, insights.Count));
            await messagingInsert.EnqueueOutboxEventAsync(
                EventTypes.AIGenerationCompleted,
                "insight_generation_run",
                run.Id,
                payload,
                $"ai_generation.completed.{run.Id}",
                cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await updateService.MarkRunFailedAsync(run.Id, ex.Message, cancellationToken);
        }
    }
}
