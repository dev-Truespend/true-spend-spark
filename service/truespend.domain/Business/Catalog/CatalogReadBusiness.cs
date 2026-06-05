using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Business.Catalog;

public sealed class CatalogReadBusiness(ICatalogReadService catalogReadService) : ICatalogReadBusiness
{
    public async Task<BusinessResponse<IssuersResponse>> GetIssuersAsync(CancellationToken cancellationToken) =>
        BusinessResponse<IssuersResponse>.Ok(new IssuersResponse(await catalogReadService.GetIssuersAsync(cancellationToken)));

    public async Task<BusinessResponse<CardProductsResponse>> GetProductsAsync(int? issuerId, string? query, CancellationToken cancellationToken) =>
        BusinessResponse<CardProductsResponse>.Ok(new CardProductsResponse(await catalogReadService.GetProductsAsync(issuerId, query, cancellationToken)));

    public async Task<BusinessResponse<CardProductDetailResponse>> GetProductAsync(int cardProductId, CancellationToken cancellationToken)
    {
        var detail = await catalogReadService.GetProductAsync(cardProductId, cancellationToken);
        return detail is null
            ? BusinessResponse<CardProductDetailResponse>.Fail(["Card product not found."], 404)
            : BusinessResponse<CardProductDetailResponse>.Ok(detail);
    }

    public async Task<BusinessResponse<CategoriesResponse>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        BusinessResponse<CategoriesResponse>.Ok(new CategoriesResponse(await catalogReadService.GetCategoriesAsync(cancellationToken)));
}
