using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsDeleteBusiness(
    ICardsReadService readService,
    ICardsDeleteService deleteService,
    IBillingReadBusiness billingRead,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork) : ICardsDeleteBusiness
{
    public async Task<BusinessResponse<CardsResponse>> DeleteCardAsync(
        OnboardingWorkflowUser user,
        int cardId,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var cards = await readService.GetCardsAsync(user, cancellationToken);
        var target = cards.FirstOrDefault(c => c.Id == cardId);
        if (target is null) return BusinessResponse<CardsResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await deleteService.SoftDeleteCardAsync(user, cardId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var updated = await readService.GetCardsAsync(user, cancellationToken);
        var entitlements = await billingRead.GetEntitlementsAsync(user, cancellationToken);
        return BusinessResponse<CardsResponse>.Ok(new CardsResponse(updated, CardLimitsCalculator.Calculate(updated, entitlements.Data!)));
    }

    #region archive — async event-publish (disabled in MVP)
    // DeleteCardAsync previously published UserCardDeleted to the messaging outbox.
    // No live subscriber exists in EventDispatcher routes today; no inline replacement is needed.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Cards;
    // using TrueSpend.Domain.Constants;
    //
    // // Inside the committing tx, after SoftDeleteCardAsync:
    // var payload = JsonSerializer.Serialize(new UserCardEventContract(
    //     cardId, user.UserId, null, null, target.Source, target.SyncStatus, target.IsPrimary, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.UserCardDeleted, "finance.user_card", cardId, payload, null, cancellationToken);
    #endregion
}
