using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
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
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationsReadBusiness(
    ICardsReadService cardsReadService,
    IMerchantsReadService merchantsReadService,
    IGeoPlaceMatchReadService geoReadService,
    RecommendationsValidator validator,
    IRecommendationBuilderBusiness recommendationBuilder) : IRecommendationsReadBusiness
{
    // Mirrors the spend assumption Foursquare uses for arrival pushes — keeps
    // expected-reward math comparable across surfaces.
    private const decimal AssumedSpendAmount = 25m;
    private const int PortfolioTopCategoriesPerCard = 3;
    private const int DefaultNearbyLimit = 30;
    private const int MaxNearbyLimit = 50;
    private static readonly TimeSpan RecentVisitWindow = TimeSpan.FromDays(30);

    public async Task<BusinessResponse<RecommendationResponse>> GetHomeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var cards = await cardsReadService.GetCardsAsync(user, cancellationToken);
        if (cards.Count == 0)
        {
            return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(
                null,
                new HomeEmptyState(
                    "Add cards to unlock recommendations",
                    "Connect a bank or add a card manually to see which card wins at checkout.",
                    "add_manual_card",
                    "connect_bank",
                    "Pro unlocks unlimited card links."),
                Portfolio: null));
        }

        // Portfolio is the home's anchor — always returned alongside any recommendation
        // so the mobile renders the same per-card summary regardless of recommendation state.
        var portfolio = await cardsReadService.GetPortfolioAsync(user, PortfolioTopCategoriesPerCard, cancellationToken);

        // Replay the user's most recent (≤30 day) merchant visit as the home
        // recommendation. Honors the category the user explicitly picked on
        // that visit, not the merchant's default — see `GetMostRecentVisitAsync`.
        var recentVisit = await merchantsReadService.GetMostRecentVisitAsync(user, RecentVisitWindow, cancellationToken);
        if (recentVisit is not null)
        {
            var replay = await recommendationBuilder.BuildAsync(
                user,
                recentVisit.Merchant,
                recentVisit.CategoryCode,
                AssumedSpendAmount,
                RecommendationsConstants.HomeContextCode,
                cancellationToken);

            if (replay is not null)
            {
                return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(replay, null, portfolio));
            }
        }

        // Has cards but no replay candidate (no recent visit, or builder declined).
        // No recommendation; the portfolio block carries the screen.
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(null, null, portfolio));
    }

    public async Task<BusinessResponse<NearbyMerchantsResult>> GetNearbyMerchantsAsync(
        OnboardingWorkflowUser user,
        NearbyMerchantsRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateNearbyMerchants(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<NearbyMerchantsResult>.Fail(errors, 400);
        }

        var limit = request.Limit is null or <= 0 ? DefaultNearbyLimit : Math.Min(request.Limit.Value, MaxNearbyLimit);
        var merchants = await geoReadService.FindNearbyMerchantsInBoundsAsync(
            request.SwLat, request.SwLng, request.NeLat, request.NeLng,
            request.CenterLat, request.CenterLng, limit, cancellationToken);

        // No fabrication: an empty result is a valid "nothing rewardable in view" state — the map
        // simply shows no pins.
        return BusinessResponse<NearbyMerchantsResult>.Ok(new NearbyMerchantsResult(merchants));
    }
}
