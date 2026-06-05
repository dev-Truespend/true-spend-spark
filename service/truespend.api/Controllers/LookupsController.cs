using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Lookup;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class LookupsController(
    ILookupReadBusiness readBusiness,
    ILookupsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet("currencies")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> Currencies(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCurrenciesAsync(cancellationToken), mapper.ToCurrencies);

    [HttpGet("permission-states")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> PermissionStates(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPermissionStatesAsync(cancellationToken), mapper.ToPermissionStates);
}
