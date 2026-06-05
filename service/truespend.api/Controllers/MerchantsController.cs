using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Merchants;
using TrueSpend.Domain.BusinessInterfaces.Merchants;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class MerchantsController(
    IMerchantsReadBusiness readBusiness,
    IMerchantsInsertBusiness insertBusiness,
    IMerchantsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost("resolve")]
    public async Task<IActionResult> Resolve(ResolveMerchantRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.ResolveMerchantAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpGet("{merchantId:int}")]
    public async Task<IActionResult> Get(int merchantId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetMerchantAsync(merchantId, cancellationToken), mapper.ToResponse);

    [HttpPost("visits")]
    public async Task<IActionResult> CreateVisit(CreateMerchantVisitRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreateVisitAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToVisits);
}
