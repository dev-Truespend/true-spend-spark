using TrueSpend.Domain.BusinessInterfaces.Transactions;
using TrueSpend.Domain.Events.Finance;
using TrueSpend.Domain.Events.Transactions;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.Validators;
using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Transactions;

public sealed class TransactionsInsertBusiness(
    ITransactionsInsertService insertService,
    ITransactionsReadService readService,
    IRewardRulesReadService rewardRulesReadService,
    ICatalogReadService catalogReadService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork,
    TransactionsValidator validator) : ITransactionsInsertBusiness
{
    public async Task<BusinessResponse<TransactionDetailResponse>> CreateTransactionAsync(
        OnboardingWorkflowUser user,
        CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
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
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            transactionId = await insertService.InsertTransactionAsync(user, request, null, matchedCategory is not null ? (short)matchedCategory.Id : null, cancellationToken);
            await insertService.InsertRewardResultAsync(transactionId, computed.RewardResult, cancellationToken);

            int? missedRewardEventId = null;
            if (computed.HasMissedReward)
            {
                missedRewardEventId = await insertService.InsertMissedRewardAsync(
                    transactionId, computed.BetterCard!.Card.Id, computed.RewardResult.EarnedAmount, computed.PotentialAmount, computed.MissedAmount, cancellationToken);
            }

            var payload = JsonSerializer.Serialize(new TransactionEventContract(
                transactionId, user.UserId, request.CardId, TransactionsConstants.SourceManual,
                request.Amount, request.CategoryCode, request.TransactionDate));
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.TransactionCreated,
                "finance.transaction",
                transactionId,
                payload,
                $"transaction.created:{transactionId}",
                cancellationToken);

            if (missedRewardEventId is { } eventId)
            {
                var missedPayload = JsonSerializer.Serialize(new MissedRewardEventCreatedContract(
                    1, eventId, transactionId, user.UserId, DateTimeOffset.UtcNow));
                await messagingInsertService.EnqueueOutboxEventAsync(
                    EventTypes.MissedRewardEventCreated,
                    "finance.missed_reward_event",
                    eventId,
                    missedPayload,
                    $"missed_reward_event.created:{eventId}",
                    cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }

        var detail = await readService.GetTransactionDetailAsync(user, transactionId, cancellationToken);
        var savedMissed = computed.HasMissedReward ? await readService.GetMissedRewardAsync(user, transactionId, cancellationToken) : null;
        return BusinessResponse<TransactionDetailResponse>.Ok(new TransactionDetailResponse(detail!, computed.RewardResult, savedMissed));
    }

}
