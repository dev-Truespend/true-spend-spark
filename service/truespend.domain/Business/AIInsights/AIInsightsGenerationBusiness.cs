using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Business.AIInsights;

public sealed class AIInsightsGenerationBusiness(
    IAIInsightsReadService readService,
    IAIInsightsInsertService insertService,
    IAIInsightsUpdateService updateService,
    IAIOpenAIService openAIService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IEntitlementGuard entitlementGuard,
    IUnitOfWork unitOfWork,
    IAIInsightsCacheInvalidatorBusiness aiInsightsCacheInvalidator,
    ILogger<AIInsightsGenerationBusiness> logger) : IAIInsightsGenerationBusiness
{
    public async Task GenerateForAllEligibleUsersAsync(CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var candidateUserIds = await readService.GetNightlyGenerationCandidatesAsync(cancellationToken);
        foreach (var userId in candidateUserIds)
        {
            if (cancellationToken.IsCancellationRequested) return;

            // Authoritative entitlement re-check (handles plan -> feature mapping + past-due grace).
            // Skip quietly so we don't create a run that would only be marked failed.
            if (!await entitlementGuard.HasFeatureAsync(new OnboardingWorkflowUser(userId, null), BillingConstants.AiInsightsEnabledFeatureCode, cancellationToken))
                continue;

            InsightGenerationRun run;
            try
            {
                run = await insertService.CreateGenerationRunAsync(userId, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Failed to create nightly AI insight run for user {UserId}", userId);
                continue;
            }

            await ProcessRunAsync(run, cancellationToken);
        }
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

            await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
            {
                await insertService.InsertInsightsAsync(run.Id, run.UserId, insights, cancellationToken);
                await updateService.MarkRunSucceededAsync(run.Id, insights.Count, cancellationToken);
                await tx.CommitAsync(cancellationToken);
            }

            try
            {
                await aiInsightsCacheInvalidator.InvalidateForUserAsync(run.UserId, run.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "AI insights cache invalidation failed for user {UserId} run {RunId}", run.UserId, run.Id);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await updateService.MarkRunFailedAsync(run.Id, ex.Message, cancellationToken);
        }
    }

    #region archive — async event-publish (disabled in MVP)
    // ProcessRunAsync previously published AIGenerationCompleted to the messaging outbox.
    // Consumer: AIGenerationCompletedHandler → IAIInsightsCacheInvalidatorBusiness.InvalidateForUserAsync(userId, runId).
    // Now called inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Insights;
    //
    // // Inside the committing tx, after MarkRunSucceededAsync:
    // var payload = JsonSerializer.Serialize(new AIGenerationCompletedEventContract(run.Id, run.UserId, insights.Count));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.AIGenerationCompleted, "insight_generation_run", run.Id,
    //     payload, $"ai_generation.completed.{run.Id}", cancellationToken);
    #endregion

    #region archive — pending-runs draining (no user-facing generate in MVP)
    // Nothing creates "pending" generation runs in the MVP (the user-facing POST /ai-insights/generate
    // endpoint is archived). Generation is worker-only via GenerateForAllEligibleUsersAsync, which
    // creates and processes runs in the same pass. This drain loop is retained for future re-enable.
    //
    // public async Task ProcessPendingRunsAsync(CancellationToken cancellationToken)
    // {
    //     _ = messagingInsert;
    //
    //     var pendingRuns = await readService.GetPendingRunsAsync(cancellationToken);
    //     foreach (var run in pendingRuns)
    //         await ProcessRunAsync(run, cancellationToken);
    // }
    #endregion
}
