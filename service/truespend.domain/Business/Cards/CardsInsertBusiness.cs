using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Events.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using System.Text.Json;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsInsertBusiness(
    ICardsInsertService cardsInsertService,
    ICardsReadService cardsReadService,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork,
    IEntitlementGuard entitlementGuard,
    CardsValidator validator) : ICardsInsertBusiness
{
    public async Task<BusinessResponse<CardDetailResponse>> CreateManualCardAsync(
        OnboardingWorkflowUser user,
        CreateManualCardRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCreateManualCard(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<CardDetailResponse>.Fail(errors, 400);
        }

        var currentCards = await cardsReadService.CountActiveUserCardsAsync(user, cancellationToken);
        await entitlementGuard.RequireCardLinkCapacityAsync(user, currentCards, cancellationToken);

        var product = await cardsInsertService.FindProductAsync(request.CardProductId, cancellationToken);
        var issuer = await cardsInsertService.FindIssuerAsync(request.IssuerId, cancellationToken);
        if (product is null || issuer is null)
        {
            return BusinessResponse<CardDetailResponse>.Fail(["Card product and issuer are required."], 400);
        }

        var card = new CardSummary(
            0,
            request.Nickname ?? product.DisplayName,
            issuer.DisplayName,
            request.LastFour,
            "manual",
            request.IsPrimary,
            "active",
            null);

        CardSummary saved;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            saved = await cardsInsertService.InsertCardAsync(user, request.CardProductId, card, cancellationToken);

            var payload = JsonSerializer.Serialize(new UserCardEventContract(
                saved.Id,
                user.UserId,
                request.CardProductId,
                null,
                "manual",
                saved.SyncStatus,
                saved.IsPrimary,
                DateTimeOffset.UtcNow));
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.UserCardCreated,
                "finance.user_card",
                saved.Id,
                payload,
                $"user_card.created:{saved.Id}",
                cancellationToken);

            await AdvanceManualOnboardingAsync(user, cancellationToken);

            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<CardDetailResponse>.Ok(new CardDetailResponse(saved, [], null, null));
    }

    private async Task AdvanceManualOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
        var next = onboarding with { CurrentStepCode = OnboardingConstants.LocationPermissionStepCode, CardConnectionManual = true };
        await onboardingUpdateService.SaveOnboardingAsync(user, next, cancellationToken);
    }
}
