using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Events.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using System.Text.Json;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Cards;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class CatalogInsertBusiness(
    ICatalogInsertService catalogInsertService,
    ICardsInsertService cardsInsertService,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork,
    CatalogValidator validator) : ICatalogInsertBusiness
{
    public async Task<BusinessResponse<CardProductRequestResponse>> CreateCardProductRequestAsync(
        OnboardingWorkflowUser user,
        CreateCardProductRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCreateCardProductRequest(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<CardProductRequestResponse>.Fail(errors, 400);
        }

        CardProductRequest catalogRequest;
        CardSummary? card = null;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            catalogRequest = await catalogInsertService.InsertProductRequestAsync(user, request.IssuerName, request.CardName, cancellationToken);
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.CardProductRequestCreated,
                "catalog.card_product_request",
                catalogRequest.Id,
                JsonSerializer.Serialize(new CardProductRequestEventContract(
                    catalogRequest.Id,
                    user.UserId,
                    catalogRequest.IssuerName,
                    catalogRequest.CardName,
                    catalogRequest.Status,
                    DateTimeOffset.UtcNow)),
                $"card_product_request.created:{catalogRequest.Id}",
                cancellationToken);

            if (request.CreateUserCard)
            {
                var draft = new CardSummary(
                    0,
                    request.Nickname ?? catalogRequest.CardName,
                    catalogRequest.IssuerName,
                    request.LastFour,
                    "manual",
                    request.IsPrimary,
                    "active",
                    null);

                card = await cardsInsertService.InsertCardAsync(user, null, draft, cancellationToken);
                await messagingInsertService.EnqueueOutboxEventAsync(
                    EventTypes.UserCardCreated,
                    "finance.user_card",
                    card.Id,
                    JsonSerializer.Serialize(new UserCardEventContract(
                        card.Id,
                        user.UserId,
                        null,
                        catalogRequest.Id,
                        "manual",
                        card.SyncStatus,
                        card.IsPrimary,
                        DateTimeOffset.UtcNow)),
                    $"user_card.created:{card.Id}",
                    cancellationToken);

                var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
                await onboardingUpdateService.SaveOnboardingAsync(user, onboarding with
                {
                    CurrentStepCode = OnboardingConstants.LocationPermissionStepCode,
                    CardConnectionManual = true
                }, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<CardProductRequestResponse>.Ok(new CardProductRequestResponse(catalogRequest, card));
    }
}
