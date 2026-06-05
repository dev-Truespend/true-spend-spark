using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Recommendations;
using DomainRec = TrueSpend.Domain.Models.Recommendations.Recommendation;
using DomainResp = TrueSpend.Domain.Models.Recommendations.RecommendationResponse;
using DomainEmpty = TrueSpend.Domain.Models.Recommendations.HomeEmptyState;
using DomainCard = TrueSpend.Domain.Models.Recommendations.RecommendationCard;
using DomainInStore = TrueSpend.Domain.Models.Recommendations.InStoreRecommendationRequest;
using DomainRefresh = TrueSpend.Domain.Models.Recommendations.RefreshRecommendationRequest;
using DomainCategory = TrueSpend.Domain.Models.Recommendations.UpdateRecommendationCategoryRequest;
using DomainMoney = TrueSpend.Domain.Models.Common.Money;

namespace TrueSpend.Api.Mappers;

public interface IRecommendationsMapper
{
    DomainInStore ToDomain(InStoreRecommendationRequestVm request);
    DomainRefresh ToDomain(RefreshRecommendationRequestVm request);
    DomainCategory ToDomain(UpdateRecommendationCategoryRequestVm request);
    RecommendationResponseVm ToResponse(DomainResp domain, ICardsMapper cardsMapper, IMerchantsMapper merchantsMapper);
}

public sealed class RecommendationsMapper : IRecommendationsMapper
{
    public DomainInStore ToDomain(InStoreRecommendationRequestVm request) =>
        new(request.MerchantId, request.CategoryCode, request.EstimatedAmount);

    public DomainRefresh ToDomain(RefreshRecommendationRequestVm request) =>
        new(request.MerchantId, request.CategoryCode);

    public DomainCategory ToDomain(UpdateRecommendationCategoryRequestVm request) =>
        new(request.RecommendationId, request.CategoryCode);

    public RecommendationResponseVm ToResponse(DomainResp domain, ICardsMapper cardsMapper, IMerchantsMapper merchantsMapper) =>
        new(
            domain.Recommendation is null ? null : ToRecommendation(domain.Recommendation, cardsMapper, merchantsMapper),
            domain.EmptyState is null ? null : ToEmpty(domain.EmptyState));

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
