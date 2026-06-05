using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Permissions;
using TrueSpend.Domain.BusinessInterfaces.Permissions;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class PermissionsController(
    IPermissionsReadBusiness readBusiness,
    IPermissionsUpdateBusiness updateBusiness,
    IPermissionsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPermissionsAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost]
    public async Task<IActionResult> Update(UpdatePermissionsRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdatePermissionsAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);
}
