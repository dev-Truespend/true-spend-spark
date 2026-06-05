using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Events.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsDeleteBusiness(
    ICardsReadService readService,
    ICardsDeleteService deleteService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork) : ICardsDeleteBusiness
{
    public async Task<BusinessResponse<CardsResponse>> DeleteCardAsync(
        OnboardingWorkflowUser user,
        int cardId,
        CancellationToken cancellationToken)
    {
        var cards = await readService.GetCardsAsync(user, cancellationToken);
        var target = cards.FirstOrDefault(c => c.Id == cardId);
        if (target is null) return BusinessResponse<CardsResponse>.Fail(["Card not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await deleteService.SoftDeleteCardAsync(user, cardId, cancellationToken);
            var payload = JsonSerializer.Serialize(new UserCardEventContract(
                cardId, user.UserId, null, null, target.Source, target.SyncStatus, target.IsPrimary, DateTimeOffset.UtcNow));
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.UserCardDeleted, "finance.user_card", cardId, payload, null, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var updated = await readService.GetCardsAsync(user, cancellationToken);
        var planCode = await readService.CurrentPlanCodeAsync(user, cancellationToken);
        return BusinessResponse<CardsResponse>.Ok(new CardsResponse(updated, CardLimitsCalculator.Calculate(updated, planCode)));
    }
}
