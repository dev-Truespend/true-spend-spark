using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Catalog;
using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/card-catalog")]
public sealed class CardCatalogController(
    ICatalogReadBusiness readBusiness,
    ICatalogInsertBusiness insertBusiness,
    ICatalogMapper mapper,
    ICardsMapper cardsMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet("issuers")]
    public async Task<IActionResult> GetIssuers(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetIssuersAsync(cancellationToken), mapper.ToIssuers);

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] int? issuerId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetProductsAsync(issuerId, null, cancellationToken), mapper.ToProducts);

    [HttpGet("products/{cardProductId:int}")]
    public async Task<IActionResult> GetProduct(int cardProductId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetProductAsync(cardProductId, cancellationToken), mapper.ToProductDetail);

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] int? issuerId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetProductsAsync(issuerId, q, cancellationToken), mapper.ToProducts);

    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest(CreateCardProductRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreateCardProductRequestAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToRequestResponse(domain, cardsMapper));

    [HttpGet("categories")]
    public async Task<IActionResult> Categories(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCategoriesAsync(cancellationToken), mapper.ToCategories);
}
