using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using System.Text.Json;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Events.Cards;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidInsertBusiness(
    IPlaidProvider plaidProvider,
    IPlaidInsertService plaidInsertService,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork,
    IEntitlementGuard entitlementGuard,
    ICardsReadService cardsReadService,
    PlaidValidator validator) : IPlaidInsertBusiness
{
    public async Task<BusinessResponse<PlaidLinkTokenResponse>> CreatePlaidLinkTokenAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);
        try
        {
            var token = await plaidProvider.CreateLinkTokenAsync(user, cancellationToken);
            return BusinessResponse<PlaidLinkTokenResponse>.Ok(token);
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<PlaidLinkTokenResponse>.Fail([ex.Message], 503);
        }
    }

    public async Task<BusinessResponse<PlaidConnectionResponse>> ExchangePlaidTokenAsync(
        OnboardingWorkflowUser user,
        ExchangePlaidTokenRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateExchangePlaidToken(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<PlaidConnectionResponse>.Fail(errors, 400);
        }

        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);
        var currentCards = await cardsReadService.CountActiveUserCardsAsync(user, cancellationToken);
        await entitlementGuard.RequireCardLinkCapacityAsync(user, currentCards, cancellationToken);

        PlaidExchangeResult exchange;
        try
        {
            exchange = await plaidProvider.ExchangePublicTokenAsync(request.PublicToken, cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<PlaidConnectionResponse>.Fail([ex.Message], 503);
        }

        PlaidPersistResult persisted;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            persisted = await plaidInsertService.PersistPlaidConnectionAsync(user, exchange, cancellationToken);
            foreach (var card in persisted.CreatedCards)
            {
                var payload = JsonSerializer.Serialize(new UserCardEventContract(
                    card.Id,
                    user.UserId,
                    null,
                    null,
                    "plaid",
                    card.SyncStatus,
                    card.IsPrimary,
                    DateTimeOffset.UtcNow));
                await messagingInsertService.EnqueueOutboxEventAsync(
                    EventTypes.UserCardCreated,
                    "finance.user_card",
                    card.Id,
                    payload,
                    $"user_card.created:{card.Id}",
                    cancellationToken);
            }

            var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
            await onboardingUpdateService.SaveOnboardingAsync(user, onboarding with
            {
                CurrentStepCode = OnboardingConstants.LocationPermissionStepCode,
                CardConnectionPlaid = true
            }, cancellationToken);

            await tx.CommitAsync(cancellationToken);
        }

        var state = await plaidInsertService.GetCurrentStateAsync(user, cancellationToken);
        return BusinessResponse<PlaidConnectionResponse>.Ok(state);
    }
}
