using TrueSpend.Api.ViewModels.Cards;
using TrueSpend.Api.ViewModels.Catalog;
using DomainIssuer = TrueSpend.Domain.Models.Catalog.Issuer;
using DomainProduct = TrueSpend.Domain.Models.Catalog.CardProduct;
using DomainIssuers = TrueSpend.Domain.Models.Catalog.IssuersResponse;
using DomainProducts = TrueSpend.Domain.Models.Catalog.CardProductsResponse;
using DomainProductDetail = TrueSpend.Domain.Models.Catalog.CardProductDetailResponse;
using DomainCreate = TrueSpend.Domain.Models.Catalog.CreateCardProductRequest;
using DomainRequest = TrueSpend.Domain.Models.Catalog.CardProductRequest;
using DomainRequestResp = TrueSpend.Domain.Models.Catalog.CardProductRequestResponse;
using DomainCategory = TrueSpend.Domain.Models.Recommendations.Category;
using DomainCategories = TrueSpend.Domain.Models.Recommendations.CategoriesResponse;

namespace TrueSpend.Api.Mappers;

public interface ICatalogMapper
{
    DomainCreate ToDomain(CreateCardProductRequestVm request);
    IssuersResponseVm ToIssuers(DomainIssuers domain);
    CardProductsResponseVm ToProducts(DomainProducts domain);
    CardProductDetailResponseVm ToProductDetail(DomainProductDetail domain);
    CardProductRequestResponseVm ToRequestResponse(DomainRequestResp domain, ICardsMapper cardsMapper);
    CategoriesResponseVm ToCategories(DomainCategories domain);
}

public sealed class CatalogMapper : ICatalogMapper
{
    public DomainCreate ToDomain(CreateCardProductRequestVm request) =>
        new(request.IssuerName, request.CardName, request.CreateUserCard, request.Nickname, request.LastFour, request.IsPrimary);

    public IssuersResponseVm ToIssuers(DomainIssuers domain) =>
        new(domain.Issuers.Select(ToIssuer).ToArray());

    public CardProductsResponseVm ToProducts(DomainProducts domain) =>
        new(domain.Products.Select(ToProduct).ToArray());

    public CardProductDetailResponseVm ToProductDetail(DomainProductDetail domain) =>
        new(
            ToProduct(domain.Product),
            domain.RewardRules.Select(r => new RewardRuleVm(r.CategoryCode, r.CategoryName, CategoryIconMap.Resolve(r.CategoryGroup ?? r.CategoryCode), r.Multiplier, r.CapDisplay, r.Notes)).ToArray(),
            domain.Terms is null
                ? null
                : new CardTermsVm(domain.Terms.AnnualFee, domain.Terms.PurchaseApr, domain.Terms.ForeignTransactionFee, domain.Terms.TermsSummary));

    public CardProductRequestResponseVm ToRequestResponse(DomainRequestResp domain, ICardsMapper cardsMapper) =>
        new(ToRequest(domain.Request), domain.UserCard is null ? null : cardsMapper.ToCardSummary(domain.UserCard));

    public CategoriesResponseVm ToCategories(DomainCategories domain) =>
        new(domain.Categories.Select(ToCategory).ToArray());

    private static IssuerVm ToIssuer(DomainIssuer domain) => new(domain.Id, domain.DisplayName, domain.LogoUrl);

    private static CardProductVm ToProduct(DomainProduct domain) =>
        new(domain.Id, domain.IssuerName, domain.DisplayName, domain.CardArtUrl, domain.AnnualFee, domain.RewardCurrencyName);

    private static CardProductRequestVm ToRequest(DomainRequest domain) =>
        new(domain.Id, domain.IssuerName, domain.CardName, domain.Status);

    private static CategoryVm ToCategory(DomainCategory domain) =>
        new(domain.Id, domain.Code, domain.DisplayName, domain.Icon);
}
