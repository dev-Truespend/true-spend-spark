using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Cards;
using TrueSpend.Domain.BusinessInterfaces.Cards;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class CardsController(
    ICardsReadBusiness readBusiness,
    ICardsInsertBusiness insertBusiness,
    ICardsUpdateBusiness updateBusiness,
    ICardsDeleteBusiness deleteBusiness,
    ICardsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> GetCards(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCardsAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpGet("limits")]
    public async Task<IActionResult> GetLimits(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCardLimitsAsync(CurrentUser(), cancellationToken), mapper.ToLimits);

    [HttpGet("{cardId:int}")]
    public async Task<IActionResult> GetCardDetail(int cardId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCardDetailAsync(CurrentUser(), cardId, cancellationToken), mapper.ToDetail);

    [HttpPost("manual")]
    public async Task<IActionResult> CreateManual(CreateManualCardRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreateManualCardAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToDetail);

    [HttpPost("{cardId:int}")]
    public async Task<IActionResult> UpdateCard(int cardId, UpdateCardRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateCardAsync(CurrentUser(), cardId, mapper.ToDomain(request), cancellationToken), mapper.ToDetail);

    [HttpPost("{cardId:int}/primary")]
    public async Task<IActionResult> SetPrimary(int cardId, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.SetPrimaryAsync(CurrentUser(), cardId, cancellationToken), mapper.ToResponse);

    [HttpPost("{cardId:int}/delete")]
    public async Task<IActionResult> DeleteCard(int cardId, CancellationToken cancellationToken) =>
        Respond(await deleteBusiness.DeleteCardAsync(CurrentUser(), cardId, cancellationToken), mapper.ToResponse);

    [HttpGet("{cardId:int}/reward-overrides")]
    public async Task<IActionResult> GetRewardOverrides(int cardId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetRewardOverridesAsync(CurrentUser(), cardId, cancellationToken), mapper.ToRewardOverrides);

    [HttpPost("{cardId:int}/reward-overrides")]
    public async Task<IActionResult> UpsertRewardOverride(int cardId, UpsertRewardOverrideRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpsertRewardOverrideAsync(CurrentUser(), cardId, mapper.ToDomain(request), cancellationToken), mapper.ToRewardOverrides);

    [HttpPost("{cardId:int}/reward-overrides/delete")]
    public async Task<IActionResult> DeleteRewardOverride(int cardId, DeleteRewardOverrideRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.DeleteRewardOverrideAsync(CurrentUser(), cardId, mapper.ToDomain(request), cancellationToken), mapper.ToRewardOverrides);
}
