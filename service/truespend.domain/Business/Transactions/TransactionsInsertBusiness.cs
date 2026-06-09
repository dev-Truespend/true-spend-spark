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

public sealed class TransactionsInsertBusiness(
    ITransactionsInsertService insertService,
    ITransactionsReadService readService,
    IRewardRulesReadService rewardRulesReadService,
    ICatalogReadService catalogReadService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IAnalyticsComputeBusiness analyticsCompute,
    IMissedRewardNotificationBusiness missedRewardNotification,
    ILogger<TransactionsInsertBusiness> logger,
    TransactionsValidator validator) : ITransactionsInsertBusiness
{
    public async Task<BusinessResponse<TransactionDetailResponse>> CreateTransactionAsync(
        OnboardingWorkflowUser user,
        CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var errors = validator.ValidateCreate(request);
        if (errors.Count > 0)
            return BusinessResponse<TransactionDetailResponse>.Fail(errors, 400);

        var categories = await catalogReadService.GetCategoriesAsync(cancellationToken);
        var matchedCategory = categories.FirstOrDefault(c => c.Code == request.CategoryCode);

        var rewardProfile = await rewardRulesReadService.GetUserRewardProfileAsync(user, cancellationToken);
        var computed = TransactionRewardCalculator.Compute(rewardProfile, request.CardId, request.Amount, request.CategoryCode);
        if (computed is null)
            return BusinessResponse<TransactionDetailResponse>.Fail(["Card not found or not owned by user."], 400);

        int transactionId;
        int? missedRewardEventId = null;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            transactionId = await insertService.InsertTransactionAsync(user, request, null, matchedCategory is not null ? (short)matchedCategory.Id : null, cancellationToken);
            await insertService.InsertRewardResultAsync(transactionId, computed.RewardResult, cancellationToken);

            if (computed.HasMissedReward)
            {
                missedRewardEventId = await insertService.InsertMissedRewardAsync(
                    transactionId, computed.BetterCard!.Card.Id, computed.RewardResult.EarnedAmount, computed.PotentialAmount, computed.MissedAmount, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after transaction create for user {UserId} txn {TransactionId}", user.UserId, transactionId);
        }

        if (missedRewardEventId is { } eventId)
        {
            try
            {
                await missedRewardNotification.ProduceForMissedRewardEventAsync(eventId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Missed reward notification failed for user {UserId} event {EventId}", user.UserId, eventId);
            }
        }

        var detail = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        var savedMissed = computed.HasMissedReward ? await readService.GetMissedRewardAsync(user, transactionId, cancellationToken) : null;
        return BusinessResponse<TransactionDetailResponse>.Ok(new TransactionDetailResponse(detail!, computed.RewardResult, savedMissed));
    }

    #region archive — async event-publish (disabled in MVP)
    // CreateTransactionAsync previously published two events to the messaging outbox:
    //   1. TransactionCreated — consumer: AnalyticsRecomputeHandler → IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId).
    //      Now called inline post-commit.
    //   2. MissedRewardEventCreated (when computed.HasMissedReward) — consumer: MissedRewardEventCreatedHandler →
    //      IMissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync(eventId).
    //      Now called inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Finance;
    // using TrueSpend.Domain.Events.Transactions;
    //
    // // Inside the committing tx, after InsertRewardResultAsync / InsertMissedRewardAsync:
    // var payload = JsonSerializer.Serialize(new TransactionEventContract(
    //     transactionId, user.UserId, request.CardId, TransactionsConstants.SourceManual,
    //     request.Amount, request.CategoryCode, request.TransactionDate));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.TransactionCreated, "finance.transaction", transactionId,
    //     payload, $"transaction.created:{transactionId}", cancellationToken);
    //
    // if (missedRewardEventId is { } eventId)
    // {
    //     var missedPayload = JsonSerializer.Serialize(new MissedRewardEventCreatedContract(
    //         1, eventId, transactionId, user.UserId, DateTimeOffset.UtcNow));
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.MissedRewardEventCreated, "finance.missed_reward_event", eventId,
    //         missedPayload, $"missed_reward_event.created:{eventId}", cancellationToken);
    // }
    #endregion
}
