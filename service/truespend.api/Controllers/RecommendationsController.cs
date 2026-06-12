using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Recommendations;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class RecommendationsController(
    IRecommendationsReadBusiness readBusiness,
    IRecommendationsInsertBusiness insertBusiness,
    IRecommendationsUpdateBusiness updateBusiness,
    IRecommendationsMapper mapper,
    ICardsMapper cardsMapper,
    IMerchantsMapper merchantsMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet("home")]
    public async Task<IActionResult> Home(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetHomeAsync(CurrentUser(), cancellationToken), domain => mapper.ToResponse(domain, cardsMapper, merchantsMapper));

    [HttpPost("in-store")]
    public async Task<IActionResult> InStore(InStoreRecommendationRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.GetInStoreRecommendationAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToResponse(domain, cardsMapper, merchantsMapper));

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRecommendationRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.RefreshRecommendationAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToResponse(domain, cardsMapper, merchantsMapper));

    [HttpPost("nearby")]
    public async Task<IActionResult> Nearby(NearbyRecommendationRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.GetNearbyRecommendationAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToResponse(domain, cardsMapper, merchantsMapper));

    [HttpPost("category")]
    public async Task<IActionResult> Category(UpdateRecommendationCategoryRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateCategoryAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToResponse(domain, cardsMapper, merchantsMapper));
}
