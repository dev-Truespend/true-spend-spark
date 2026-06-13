using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Recommendations;
using DomainRec = TrueSpend.Domain.Models.Recommendations.Recommendation;
using DomainResp = TrueSpend.Domain.Models.Recommendations.RecommendationResponse;
using DomainEmpty = TrueSpend.Domain.Models.Recommendations.HomeEmptyState;
using DomainCard = TrueSpend.Domain.Models.Recommendations.RecommendationCard;
using DomainPortfolioCard = TrueSpend.Domain.Models.Recommendations.PortfolioCard;
using DomainPortfolioCategory = TrueSpend.Domain.Models.Recommendations.PortfolioCategory;
using DomainInStore = TrueSpend.Domain.Models.Recommendations.InStoreRecommendationRequest;
using DomainRefresh = TrueSpend.Domain.Models.Recommendations.RefreshRecommendationRequest;
using DomainNearby = TrueSpend.Domain.Models.Recommendations.NearbyRecommendationRequest;
using DomainCategory = TrueSpend.Domain.Models.Recommendations.UpdateRecommendationCategoryRequest;
using DomainPlace = TrueSpend.Domain.Models.Recommendations.PlaceRecommendationRequest;
using DomainMoney = TrueSpend.Domain.Models.Common.Money;
using DomainNearbyMerchants = TrueSpend.Domain.Models.Geo.NearbyMerchantsRequest;
using DomainNearbyMerchantsResult = TrueSpend.Domain.Models.Geo.NearbyMerchantsResult;
using DomainNearbyMerchant = TrueSpend.Domain.Models.Geo.NearbyMerchant;

namespace TrueSpend.Api.Mappers;

public interface IRecommendationsMapper
{
    DomainInStore ToDomain(InStoreRecommendationRequestVm request);
    DomainRefresh ToDomain(RefreshRecommendationRequestVm request);
    DomainNearby ToDomain(NearbyRecommendationRequestVm request);
    DomainCategory ToDomain(UpdateRecommendationCategoryRequestVm request);
    DomainPlace ToDomain(PlaceRecommendationRequestVm request);
    DomainNearbyMerchants ToDomain(NearbyMerchantsRequestVm request);
    RecommendationResponseVm ToResponse(DomainResp domain, ICardsMapper cardsMapper, IMerchantsMapper merchantsMapper);
    NearbyMerchantsResponseVm ToNearbyMerchants(DomainNearbyMerchantsResult domain);
}

public sealed class RecommendationsMapper : IRecommendationsMapper
{
    public DomainInStore ToDomain(InStoreRecommendationRequestVm request) =>
        new(request.MerchantId, request.CategoryCode, request.EstimatedAmount);

    public DomainRefresh ToDomain(RefreshRecommendationRequestVm request) =>
        new(request.MerchantId, request.CategoryCode);

    public DomainNearby ToDomain(NearbyRecommendationRequestVm request) =>
        new(request.Lat, request.Lng, request.AccuracyMeters, request.EstimatedAmount);

    public DomainCategory ToDomain(UpdateRecommendationCategoryRequestVm request) =>
        new(request.RecommendationId, request.CategoryCode);

    public DomainPlace ToDomain(PlaceRecommendationRequestVm request) =>
        new(request.ProviderPlaceId, request.Name, request.Lat, request.Lng, request.CategoryCode, request.EstimatedAmount);

    public DomainNearbyMerchants ToDomain(NearbyMerchantsRequestVm request) =>
        new(request.SwLat, request.SwLng, request.NeLat, request.NeLng, request.CenterLat, request.CenterLng, request.Limit);

    public NearbyMerchantsResponseVm ToNearbyMerchants(DomainNearbyMerchantsResult domain) =>
        new(domain.Merchants.Select(ToNearbyMerchant).ToArray());

    private static NearbyMerchantVm ToNearbyMerchant(DomainNearbyMerchant m) =>
        new(m.ProviderPlaceId, m.Name, m.Lat, m.Lng, m.CategoryCode, m.CategoryName, m.ChainName);

    public RecommendationResponseVm ToResponse(DomainResp domain, ICardsMapper cardsMapper, IMerchantsMapper merchantsMapper) =>
        new(
            domain.Recommendation is null ? null : ToRecommendation(domain.Recommendation, cardsMapper, merchantsMapper),
            domain.EmptyState is null ? null : ToEmpty(domain.EmptyState),
            domain.Portfolio is null ? null : domain.Portfolio.Select(card => ToPortfolioCard(card, cardsMapper)).ToArray());

    private static PortfolioCardVm ToPortfolioCard(DomainPortfolioCard domain, ICardsMapper cardsMapper) =>
        new(cardsMapper.ToCardSummary(domain.Card), domain.TopCategories.Select(ToPortfolioCategory).ToArray());

    private static PortfolioCategoryVm ToPortfolioCategory(DomainPortfolioCategory domain) =>
        new(domain.CategoryCode, domain.CategoryName, domain.Multiplier);

    private static RecommendationVm ToRecommendation(DomainRec domain, ICardsMapper cardsMapper, IMerchantsMapper merchantsMapper) =>
        new(
            domain.Id,
            merchantsMapper.ToMerchant(domain.Merchant),
            domain.CategoryCode,
            ToCard(domain.RecommendedCard, cardsMapper),
            domain.Reason,
            domain.RunnerUpCards.Select(card => ToCard(card, cardsMapper)).ToArray(),
            domain.CoverageWarning);

    private static RecommendationCardVm ToCard(DomainCard domain, ICardsMapper cardsMapper) =>
        new(cardsMapper.ToCardSummary(domain.Card), domain.ExpectedRewardRate, ToMoney(domain.ExpectedReward), domain.Reason, domain.Rank);

    private static MoneyVm ToMoney(DomainMoney domain) => new(domain.Amount, domain.CurrencyCode, domain.Display);

    private static HomeEmptyStateVm ToEmpty(DomainEmpty domain) =>
        new(domain.Title, domain.Body, domain.PrimaryActionCode, domain.SecondaryActionCode, domain.UpgradeMessage);
}
