using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationsInsertBusiness(
    IMerchantsReadService merchantsReadService,
    IRecommendationBuilderBusiness builder,
    IGeoPlaceMatchBusiness placeMatchBusiness,
    IMerchantResolveBusiness merchantResolve,
    RecommendationsValidator validator) : IRecommendationsInsertBusiness
{
    private const decimal AssumedSpendAmount = 25m;

    public async Task<BusinessResponse<RecommendationResponse>> GetInStoreRecommendationAsync(
        OnboardingWorkflowUser user,
        InStoreRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateInStoreRecommendation(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var merchant = await merchantsReadService.GetMerchantAsync(request.MerchantId, cancellationToken);
        if (merchant is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["Merchant not found."], 404);
        }

        var recommendation = await builder.BuildAsync(user, merchant, request.CategoryCode ?? merchant.CategoryCode, request.EstimatedAmount ?? 25m, cancellationToken);
        if (recommendation is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["No eligible cards. Add a card to get a recommendation."], 404);
        }
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null));
    }

    public async Task<BusinessResponse<RecommendationResponse>> RefreshRecommendationAsync(
        OnboardingWorkflowUser user,
        RefreshRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateRefreshRecommendation(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var merchant = await merchantsReadService.GetMerchantAsync(request.MerchantId, cancellationToken);
        if (merchant is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["Merchant not found."], 404);
        }

        var recommendation = await builder.BuildAsync(user, merchant, request.CategoryCode ?? merchant.CategoryCode, 25m, cancellationToken);
        if (recommendation is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["No eligible cards. Add a card to get a recommendation."], 404);
        }
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null));
    }

    // Foreground "open app -> nearby best card" (03). Reuses the same coordinate place-match the geo
    // arrival pipeline (10a) uses, then the shared best-card builder — minus the notification/push/gating.
    // A wrong screen is far cheaper than a wrong push, so High AND Medium confidence both surface a card;
    // Low/None returns an empty result and the client falls back to the home (last-visited) recommendation.
    public async Task<BusinessResponse<RecommendationResponse>> GetNearbyRecommendationAsync(
        OnboardingWorkflowUser user,
        NearbyRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateNearbyRecommendation(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var match = await placeMatchBusiness.ResolveAsync(
            request.Lat, request.Lng, request.AccuracyMeters, dwellSeconds: null, movementState: null, cancellationToken);

        // No confident merchant nearby (dense lot, coarse fix, or nothing matched): return empty so the
        // client falls back to home rather than guessing a merchant.
        if (!match.HasCandidate || match.Tier is ArrivalConfidenceTierEnum.None or ArrivalConfidenceTierEnum.Low)
        {
            return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(null, null, null));
        }

        var merchant = await merchantResolve.ResolveByNameAsync(
            match.Name!, match.Provider ?? GeoConstants.ProviderCustom, match.ProviderPlaceId, address: null, cancellationToken);

        var recommendation = await builder.BuildAsync(
            user, merchant, merchant.CategoryCode, request.EstimatedAmount ?? AssumedSpendAmount, RecommendationsConstants.InStoreContextCode, cancellationToken);

        // Has a nearby merchant but no eligible cards: empty result, client shows the home empty state.
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null, null));
    }
}
