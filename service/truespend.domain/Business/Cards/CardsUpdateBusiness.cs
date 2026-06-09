using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsUpdateBusiness(
    ICardsReadService readService,
    ICardsUpdateService updateService,
    IBillingReadBusiness billingRead,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IAnalyticsComputeBusiness analyticsCompute,
    ILogger<CardsUpdateBusiness> logger,
    CardsValidator validator) : ICardsUpdateBusiness
{
    public async Task<BusinessResponse<CardDetailResponse>> UpdateCardAsync(
        OnboardingWorkflowUser user,
        int cardId,
        UpdateCardRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var errors = validator.ValidateUpdateCard(request);
        if (errors.Count > 0) return BusinessResponse<CardDetailResponse>.Fail(errors, 400);

        var existing = await updateService.FindCardAsync(user, cardId, cancellationToken);
        if (existing is null) return BusinessResponse<CardDetailResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.UpdateCardAsync(user, cardId, request, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var detail = await readService.GetCardDetailAsync(user, cardId, cancellationToken);
        return BusinessResponse<CardDetailResponse>.Ok(detail!);
    }

    public async Task<BusinessResponse<CardsResponse>> SetPrimaryAsync(
        OnboardingWorkflowUser user,
        int cardId,
        CancellationToken cancellationToken)
    {
        var existing = await updateService.FindCardAsync(user, cardId, cancellationToken);
        if (existing is null) return BusinessResponse<CardsResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.SetPrimaryAsync(user, cardId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var cards = await readService.GetCardsAsync(user, cancellationToken);
        var entitlements = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        return BusinessResponse<CardsResponse>.Ok(new CardsResponse(cards, CardLimitsCalculator.Calculate(cards, entitlements.Data!)));
    }

    public async Task<BusinessResponse<RewardOverridesResponse>> UpsertRewardOverrideAsync(
        OnboardingWorkflowUser user,
        int cardId,
        UpsertRewardOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateUpsertRewardOverride(request);
        if (errors.Count > 0) return BusinessResponse<RewardOverridesResponse>.Fail(errors, 400);

        var existing = await updateService.FindCardAsync(user, cardId, cancellationToken);
        if (existing is null) return BusinessResponse<RewardOverridesResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.UpsertRewardOverrideAsync(user, cardId, request, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after reward override upsert for user {UserId} card {CardId}", user.UserId, cardId);
        }

        var overrides = await readService.GetRewardOverridesAsync(cardId, cancellationToken);
        return BusinessResponse<RewardOverridesResponse>.Ok(overrides);
    }

    public async Task<BusinessResponse<RewardOverridesResponse>> DeleteRewardOverrideAsync(
        OnboardingWorkflowUser user,
        int cardId,
        DeleteRewardOverrideRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateDeleteRewardOverride(request);
        if (errors.Count > 0) return BusinessResponse<RewardOverridesResponse>.Fail(errors, 400);

        var existing = await updateService.FindCardAsync(user, cardId, cancellationToken);
        if (existing is null) return BusinessResponse<RewardOverridesResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.DeleteRewardOverrideAsync(user, cardId, request, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        try
        {
            await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Analytics recompute failed after reward override delete for user {UserId} card {CardId}", user.UserId, cardId);
        }

        var overrides = await readService.GetRewardOverridesAsync(cardId, cancellationToken);
        return BusinessResponse<RewardOverridesResponse>.Ok(overrides);
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateCardAsync previously published UserCardUpdated (no subscriber in EventDispatcher routes).
    // SetPrimaryAsync previously published UserCardUpdated (no subscriber).
    // UpsertRewardOverrideAsync previously published RewardOverrideUpserted; the consumer called
    //   IAnalyticsComputeBusiness.RecomputeSnapshotsAsync(userId). That call is now inline post-commit.
    // DeleteRewardOverrideAsync previously published RewardOverrideDeleted; same handler.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Cards;
    // using TrueSpend.Domain.Constants;
    //
    // // UpdateCardAsync — inside the committing tx, after UpdateCardAsync:
    // var payload = JsonSerializer.Serialize(new UserCardEventContract(
    //     updated.Id, user.UserId, null, null, updated.Source, updated.SyncStatus, updated.IsPrimary, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.UserCardUpdated, "finance.user_card", updated.Id, payload, null, cancellationToken);
    //
    // // SetPrimaryAsync — inside the committing tx, after SetPrimaryAsync:
    // var payload = JsonSerializer.Serialize(new UserCardEventContract(
    //     cardId, user.UserId, null, null, existing.Source, existing.SyncStatus, true, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.UserCardUpdated, "finance.user_card", cardId, payload, null, cancellationToken);
    //
    // // UpsertRewardOverrideAsync — inside the committing tx, after UpsertRewardOverrideAsync:
    // var payload = JsonSerializer.Serialize(new RewardOverrideEventContract(
    //     cardId, user.UserId, request.CategoryCode, request.Multiplier, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.RewardOverrideUpserted, "finance.card_reward_override", cardId, payload, null, cancellationToken);
    //
    // // DeleteRewardOverrideAsync — inside the committing tx, after DeleteRewardOverrideAsync:
    // var payload = JsonSerializer.Serialize(new RewardOverrideEventContract(
    //     cardId, user.UserId, request.CategoryCode, null, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.RewardOverrideDeleted, "finance.card_reward_override", cardId, payload, null, cancellationToken);
    #endregion
}
