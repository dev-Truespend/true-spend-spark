using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Transactions;

public sealed class TransactionsUpdateBusiness(
    ITransactionsUpdateService updateService,
    ITransactionsReadService readService,
    IRewardRulesReadService rewardRulesReadService,
    ICatalogReadService catalogReadService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IAnalyticsComputeBusiness analyticsCompute,
    IMissedRewardNotificationBusiness missedRewardNotification,
    ILogger<TransactionsUpdateBusiness> logger,
    TransactionsValidator validator) : ITransactionsUpdateBusiness
{
    public async Task<BusinessResponse<TransactionDetailResponse>> UpdateTransactionAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var errors = validator.ValidateUpdate(request);
        if (errors.Count > 0)
            return BusinessResponse<TransactionDetailResponse>.Fail(errors, 400);

        var existing = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        if (existing is null) return BusinessResponse<TransactionDetailResponse>.Fail(["Transaction not found."], 404);

        var effectiveCardId = request.CardId ?? existing.CardId;
        var effectiveCategoryCode = request.CategoryCode ?? existing.CategoryCode ?? string.Empty;
        var effectiveAmount = request.Amount ?? existing.Amount;

        short? resolvedCategoryId = null;
        if (request.CategoryCode is not null)
        {
            var categories = await catalogReadService.GetCategoriesAsync(cancellationToken);
            var matched = categories.FirstOrDefault(c => c.Code == request.CategoryCode);
            resolvedCategoryId = matched is not null ? (short)matched.Id : null;
        }

        var rewardProfile = await rewardRulesReadService.GetUserRewardProfileAsync(user, cancellationToken);
        var computed = TransactionRewardCalculator.Compute(rewardProfile, effectiveCardId, effectiveAmount, effectiveCategoryCode);
        if (computed is null)
            return BusinessResponse<TransactionDetailResponse>.Fail(["Card not found or not owned by user."], 400);

        MissedRewardUpsertResult? upsert = null;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.UpdateTransactionAsync(user, transactionId, request, resolvedCategoryId, cancellationToken);
            await updateService.UpsertRewardResultAsync(transactionId, computed.RewardResult, cancellationToken);

            if (computed.HasMissedReward)
            {
                upsert = await updateService.UpsertMissedRewardAsync(
                    transactionId, computed.BetterCard!.Card.Id, computed.RewardResult.EarnedAmount, computed.PotentialAmount, computed.MissedAmount, cancellationToken);
            }
            else
            {
                await updateService.DeleteMissedRewardAsync(transactionId, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after transaction update for user {UserId} txn {TransactionId}", user.UserId, transactionId);
        }

        if (upsert is { IsNew: true } newMissed)
        {
            try
            {
                await missedRewardNotification.ProduceForMissedRewardEventAsync(newMissed.MissedRewardEventId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Missed reward notification failed for user {UserId} event {EventId}", user.UserId, newMissed.MissedRewardEventId);
            }
        }

        var detail = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        var savedMissed = computed.HasMissedReward ? await readService.GetMissedRewardAsync(user, transactionId, cancellationToken) : null;
        return BusinessResponse<TransactionDetailResponse>.Ok(new TransactionDetailResponse(detail!, computed.RewardResult, savedMissed));
    }

    public async Task<BusinessResponse<TransactionDetailResponse>> MarkNotAMissAsync(
        OnboardingWorkflowUser user,
        int missedRewardId,
        CancellationToken cancellationToken)
    {
        var transactionId = await updateService.GetMissedRewardTransactionIdAsync(missedRewardId, cancellationToken);
        if (transactionId is null)
            return BusinessResponse<TransactionDetailResponse>.Fail(["Missed reward not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.DismissMissedRewardAsync(missedRewardId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after mark-not-a-miss for user {UserId} missed {MissedRewardId}", user.UserId, missedRewardId);
        }

        var detail = await readService.GetTransactionDetailAsync(user, transactionId.Value, cancellationToken);
        if (detail is null) return BusinessResponse<TransactionDetailResponse>.Fail(["Transaction not found."], 404);

        var reward = await readService.GetRewardResultAsync(transactionId.Value, cancellationToken);
        var related = (await readService.GetMissedRewardsAsync(user, cancellationToken)).FirstOrDefault(m => m.Id == missedRewardId);
        return BusinessResponse<TransactionDetailResponse>.Ok(new TransactionDetailResponse(detail, reward, related));
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateTransactionAsync previously published:
    //   1. TransactionUpdated — consumer: AnalyticsRecomputeHandler → IAnalyticsComputeBusiness.RecomputeSnapshotsAsync.
    //   2. MissedRewardEventCreated (when upsert.IsNew) — consumer: MissedRewardEventCreatedHandler →
    //      IMissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync.
    // MarkNotAMissAsync previously published:
    //   3. MissedRewardNotAMiss — consumer: AnalyticsRecomputeHandler → IAnalyticsComputeBusiness.RecomputeSnapshotsAsync.
    //
    // All three are now called inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Finance;
    // using TrueSpend.Domain.Events.Transactions;
    //
    // // UpdateTransactionAsync — inside the committing tx, after writes:
    // var payload = JsonSerializer.Serialize(new TransactionEventContract(
    //     transactionId, user.UserId, effectiveCardId, existing.Source,
    //     effectiveAmount, effectiveCategoryCode, request.TransactionDate ?? existing.TransactionDate));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.TransactionUpdated, "finance.transaction", transactionId,
    //     payload, $"transaction.updated:{transactionId}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
    //     cancellationToken);
    //
    // if (upsert is { IsNew: true } newMissed)
    // {
    //     var missedPayload = JsonSerializer.Serialize(new MissedRewardEventCreatedContract(
    //         1, newMissed.MissedRewardEventId, transactionId, user.UserId, DateTimeOffset.UtcNow));
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.MissedRewardEventCreated, "finance.missed_reward_event",
    //         newMissed.MissedRewardEventId, missedPayload,
    //         $"missed_reward_event.created:{newMissed.MissedRewardEventId}", cancellationToken);
    // }
    //
    // // MarkNotAMissAsync — inside the committing tx, after DismissMissedRewardAsync:
    // var payload = JsonSerializer.Serialize(new MissedRewardNotAMissEvent(missedRewardId, transactionId.Value, user.UserId));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.MissedRewardNotAMiss, "finance.missed_reward_event", missedRewardId,
    //     payload, $"missed_reward.not_a_miss:{missedRewardId}", cancellationToken);
    #endregion
}
