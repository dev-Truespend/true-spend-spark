using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidInsertBusiness(
    IPlaidProvider plaidProvider,
    IPlaidInsertService plaidInsertService,
    IPlaidUpdateService plaidUpdateService,
    IPlaidCardCatalogMatchBusiness cardCatalogMatch,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IEntitlementGuard entitlementGuard,
    ICardsReadService cardsReadService,
    PlaidValidator validator) : IPlaidInsertBusiness
{
    public async Task<BusinessResponse<PlaidLinkTokenResponse>> CreatePlaidLinkTokenAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

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
        var currentPlaidCards = await cardsReadService.CountActiveUserCardsBySourceAsync(user, "plaid", cancellationToken);
        await entitlementGuard.RequireCardLinkCapacityAsync(user, "plaid", currentPlaidCards, cancellationToken);

        PlaidExchangeResult exchange;
        try
        {
            exchange = await plaidProvider.ExchangePublicTokenAsync(request.PublicToken, cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<PlaidConnectionResponse>.Fail([ex.Message], 503);
        }

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            var persisted = await plaidInsertService.PersistPlaidConnectionAsync(user, exchange, cancellationToken);

            // For each linked account, resolve its catalog product by fuzzy-matching
            // (institution name, account name). Then decide adopt-vs-insert: if the user already
            // added this card manually (same last-four + matching product/issuer), adopt that row
            // in place — flip it to Plaid — so its reward overrides, primary flag, and history
            // survive and no duplicate is created. Otherwise insert a fresh Plaid card. Unmatched
            // products stay NULL; the post-catalog-sync back-fill picks them up later.
            var adoptedCardIds = new HashSet<int>();
            foreach (var account in persisted.Accounts)
            {
                if (cancellationToken.IsCancellationRequested) break;
                var productId = await cardCatalogMatch.MatchOneAsync(persisted.InstitutionName, account.AccountName, cancellationToken);

                var candidates = await cardsReadService.FindAdoptableManualCardsAsync(user.UserId, account.Mask, cancellationToken);
                var adoptTarget = SelectAdoptTarget(candidates, adoptedCardIds, productId, persisted.InstitutionName);

                if (adoptTarget is not null)
                {
                    adoptedCardIds.Add(adoptTarget.UserCardId);
                    await plaidUpdateService.AdoptManualCardToPlaidAsync(adoptTarget.UserCardId, account.PlaidAccountRowId, productId, cancellationToken);
                }
                else
                {
                    await plaidInsertService.InsertPlaidUserCardAsync(user, account.PlaidAccountRowId, account.AccountName, account.Mask, productId, cancellationToken);
                }
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

    // Adoption rule: among manual cards whose last-four already matched the Plaid mask, keep the
    // ones that also align on product or issuer, then prefer an exact product match, then the
    // primary card, then the oldest. Returns null when nothing aligns (insert a new card instead).
    private static AdoptableManualCard? SelectAdoptTarget(
        IReadOnlyList<AdoptableManualCard> candidates,
        HashSet<int> alreadyAdopted,
        int? productId,
        string institutionName)
    {
        var matches = candidates
            .Where(c => !alreadyAdopted.Contains(c.UserCardId))
            .Where(c => (productId.HasValue && c.CardProductId == productId.Value)
                        || IssuerMatches(c.IssuerName, institutionName))
            .ToList();

        if (matches.Count == 0) return null;

        return matches
            .OrderByDescending(c => productId.HasValue && c.CardProductId == productId.Value)
            .ThenByDescending(c => c.IsPrimary)
            .ThenBy(c => c.CreatedAt)
            .First();
    }

    private static bool IssuerMatches(string? issuerName, string institutionName)
    {
        var a = Normalize(issuerName);
        var b = Normalize(institutionName);
        if (a.Length == 0 || b.Length == 0) return false;
        return a.Contains(b) || b.Contains(a);
    }

    private static string Normalize(string? value) =>
        value is null ? string.Empty : new string(value.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

    #region archive — async event-publish (disabled in MVP)
    // ExchangePlaidTokenAsync previously published UserCardCreated for every card returned by
    // PersistPlaidConnectionAsync. The UserCardCreatedHandler in truespend.eventconsumer was
    // log-only, so no inline replacement is needed.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Cards;
    //
    // // Inside the committing tx, after PersistPlaidConnectionAsync returns `persisted`:
    // foreach (var card in persisted.CreatedCards)
    // {
    //     var payload = JsonSerializer.Serialize(new UserCardEventContract(
    //         card.Id,
    //         user.UserId,
    //         null,
    //         null,
    //         "plaid",
    //         card.SyncStatus,
    //         card.IsPrimary,
    //         DateTimeOffset.UtcNow));
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.UserCardCreated,
    //         "finance.user_card",
    //         card.Id,
    //         payload,
    //         $"user_card.created:{card.Id}",
    //         cancellationToken);
    // }
    #endregion
}
